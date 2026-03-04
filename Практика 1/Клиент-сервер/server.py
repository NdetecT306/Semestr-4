import socket
import pickle
import threading
import sys
from business_logic import BusinessLogic

class Server:
    def __init__(self, host='localhost', port=8888):
        self.host = host
        self.port = port
        self.business_logic = BusinessLogic()
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
    def start(self):
        try:
            self.server_socket.bind((self.host, self.port))
            self.server_socket.listen(5)
            print(f"Сервер запущен на {self.host}:{self.port}")
            
            while True:
                client_socket, address = self.server_socket.accept()
                print(f"Подключен клиент: {address}")
                client_thread = threading.Thread(target=self.handle_client, args=(client_socket,))
                client_thread.start()
                
        except Exception as e:
            print(f"Ошибка сервера: {e}")
        finally:
            self.server_socket.close()
    
    def handle_client(self, client_socket):
        try:
            while True:
                data = client_socket.recv(4096)
                if not data:
                    break
                    
                request = pickle.loads(data)
                response = self.process_request(request)
                client_socket.send(pickle.dumps(response))
        except:
            pass
        finally:
            client_socket.close()
    
    def process_request(self, request):
        action = request.get('action')
        
        if action == 'authenticate':
            user = self.business_logic.authenticate_user(
                request.get('username'), 
                request.get('password')
            )
            return {'user': user}
        elif action == 'user_exists':
            exists = self.business_logic.user_exists(request.get('username'))
            return {'exists': exists}
        elif action == 'register':
            user = self.business_logic.register_user(
                request.get('username'),
                request.get('password'),
                request.get('access_level')
            )
            return {'user': user}
        elif action == 'get_objects':
            objects = self.business_logic.get_accessible_objects(request.get('user'))
            return {'objects': objects}
        return {'error': 'Неизвестное действие'}

if __name__ == "__main__":
    server = Server()
    try:
        server.start()
    except KeyboardInterrupt:
        print("\nСервер остановлен")
        sys.exit(0)
