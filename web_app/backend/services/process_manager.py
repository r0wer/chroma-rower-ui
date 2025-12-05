import asyncio
import os
import pty
import subprocess
import select
import logging
import signal

logger = logging.getLogger(__name__)

class ProcessManager:
    def __init__(self):
        self.process = None
        self.master_fd = None
        self.slave_fd = None
        self.subscribers = set()
        self.running = False

    async def start_process(self, command: str, cwd: str = None):
        if self.running:
            raise Exception("Process already running")

        self.running = True
        # Create a pseudo-terminal
        self.master_fd, self.slave_fd = pty.openpty()

        try:
            self.process = subprocess.Popen(
                command,
                shell=True,
                stdin=self.slave_fd,
                stdout=self.slave_fd,
                stderr=self.slave_fd,
                cwd=cwd,
                preexec_fn=os.setsid,  # Create a new session
                close_fds=True
            )
            
            # Close slave fd in parent process as it's now attached to child
            os.close(self.slave_fd)
            self.slave_fd = None

            # Start reading output in background
            asyncio.create_task(self._read_output())
            
            return True
        except Exception as e:
            self.running = False
            if self.master_fd:
                os.close(self.master_fd)
            if self.slave_fd:
                os.close(self.slave_fd)
            raise e

    async def _read_output(self):
        try:
            while self.running and self.process.poll() is None:
                # Use select to check if data is available to read
                r, w, e = await asyncio.to_thread(select.select, [self.master_fd], [], [], 0.1)
                
                if self.master_fd in r:
                    try:
                        data = os.read(self.master_fd, 1024)
                        if data:
                            text = data.decode('utf-8', errors='replace')
                            await self.broadcast(text)
                        else:
                            # EOF
                            break
                    except OSError:
                        break
                
                await asyncio.sleep(0.01)
                
        except Exception as e:
            logger.error(f"Error reading process output: {e}")
        finally:
            self.running = False
            await self.broadcast("\n[Process finished]\n")
            if self.master_fd:
                try:
                    os.close(self.master_fd)
                except:
                    pass
            self.master_fd = None

    async def subscribe(self, websocket):
        self.subscribers.add(websocket)

    async def unsubscribe(self, websocket):
        self.subscribers.remove(websocket)

    async def broadcast(self, message: str):
        if not self.subscribers:
            return
        
        to_remove = set()
        for ws in self.subscribers:
            try:
                await ws.send_text(message)
            except Exception:
                to_remove.add(ws)
        
        self.subscribers -= to_remove

    def stop_process(self):
        if self.process and self.running:
            try:
                # Send SIGTERM to the process group to kill all children (like accelerate)
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                # Wait a bit and force kill if needed
                try:
                    self.process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                     os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                
                self.running = False
                return True
            except Exception as e:
                logger.error(f"Error stopping process: {e}")
                return False
        return False

# Global instance
process_manager = ProcessManager()
