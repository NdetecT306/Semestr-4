from presentation import Presentation
import socket
import pickle
import sys

class Client(Presentation):
    def __init__(self, host='localhost', port=8888):
        super().__init__(business_logic=None)  
        self.host = host
        self.port = port
        self.socket = None
        
    def connect(self):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))
            return True
        except:
            return False
    
    def send_request(self, request):
        try:
            self.socket.send(pickle.dumps(request))
            response = self.socket.recv(4096)
            return pickle.loads(response)
        except:
            return None
    
    # Переопределяем методы для работы через сеть
    def authenticate_user(self, username, password):
        response = self.send_request({
            'action': 'authenticate',
            'username': username,
            'password': password
        })
        return response.get('user') if response else None
    
    def user_exists(self, username):
        response = self.send_request({
            'action': 'user_exists',
            'username': username
        })
        return response.get('exists', False) if response else False
    
    def register_user(self, username, password, access_level):
        response = self.send_request({
            'action': 'register',
            'username': username,
            'password': password,
            'access_level': access_level
        })
        return response.get('user') if response else None
    
    def get_accessible_objects(self, user):
        response = self.send_request({
            'action': 'get_objects',
            'user': user
        })
        return response.get('objects', []) if response else []
    
    def run(self):
        if not self.connect():
            print("Не удалось подключиться к серверу!")
            sys.exit(1)
        super().run()

if __name__ == "__main__":
    print("СИСТЕМА МОНИТОРИНГА ОБЪЕКТОВ КИИ")
    app = Client()
    app.run()
