import socket
import sys
import os

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def client():
    """Клиент для взаимодействия с сервером КИИ"""
    HOST = '217.71.129.139'
    PORT = 4536
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        client_socket.connect((HOST, PORT))
        print("Подключение к серверу установлено")
        while True:
            response = client_socket.recv(16384).decode('utf-8')
            if not response:
                break
            if '\033[2J\033[H' in response:
                clear_screen()
                response = response.replace('\033[2J\033[H', '')
            print(response, end='')
            if response.strip().endswith('>>'):
                message = input()
                client_socket.send(message.encode('utf-8'))
                if message.lower().strip() in ['0', 'bye']:
                    final_response = client_socket.recv(4096).decode('utf-8')
                    print(final_response)
                    break
    except ConnectionRefusedError:
        print("НЕ удалось подключиться к серверу.")
        print("Убедитесь, что:")
        print("1. Сервер запущен")
        print("2. Порт правильно опубликован в облаке")
        print("3. IP-адрес и порт в client.py верны")
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        client_socket.close()
        print("Соединение закрыто")

if __name__ == '__main__':
    client()
