from collections import deque

# Each client has its own queue
class ClientQueue:
    def __init__(self):
        self.queue = deque()

    def add(self, message):
        self.queue.append(message)

    def pop_all(self):
        items = list(self.queue)
        self.queue.clear()
        return items

# Global set of all connected clients
clients = set()

def register_client(client):
    clients.add(client)

def unregister_client(client):
    clients.discard(client)

def push_notification(message: dict):
    for client in clients:
        client.add(message)