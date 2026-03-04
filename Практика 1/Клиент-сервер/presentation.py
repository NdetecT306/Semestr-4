import sys
import getpass  

class Presentation:
    def __init__(self, business_logic=None):
        self.business_logic = business_logic  # Теперь может быть None для клиента
        self.current_user = None
    
    def print_color_text(self, text, color):
        colors = {
            'green': '\033[92m',
            'yellow': '\033[93m',
            'red': '\033[91m',
            'reset': '\033[0m'
        }
        print(f"{colors.get(color, '')}{text}{colors['reset']}")
    
    def show_menu(self):
        print("ГЛАВНОЕ МЕНЮ")
        print("1. Вход")
        print("2. Регистрация")
        print("3. Выход")
    
    # Эти методы будут переопределены в клиенте
    def authenticate_user(self, username, password):
        if self.business_logic:
            return self.business_logic.authenticate_user(username, password)
        return None
    
    def user_exists(self, username):
        if self.business_logic:
            return self.business_logic.user_exists(username)
        return False
    
    def register_user(self, username, password, access_level):
        if self.business_logic:
            return self.business_logic.register_user(username, password, access_level)
        return None
    
    def get_accessible_objects(self, user):
        if self.business_logic:
            return self.business_logic.get_accessible_objects(user)
        return []
    
    def login(self):
        print("\nВХОД В СИСТЕМУ")
        username = input("Имя пользователя: ")
        password = getpass.getpass("Пароль: ")  
        user = self.authenticate_user(username, password)
        if user:
            self.current_user = user
            print(f"\nДобро пожаловать, {username}!")
            self.show_objects_list()
        else:
            print("\nНеверное имя пользователя или пароль!")
    
    def register(self):
        print("\nРЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ")
        username = input("Имя пользователя: ")
        if not username or len(username.strip()) == 0:
            print("Имя пользователя не может быть пустым!")
            return
        
        if self.user_exists(username):
            print("Пользователь с таким именем уже существует!")
            return
        
        password = getpass.getpass("Пароль: ")
        if not password or len(password) < 4:
            print("Пароль должен содержать минимум 4 символа!")
            return
        
        password_confirm = getpass.getpass("Подтвердите пароль: ")
        if password != password_confirm:
            print("Пароли не совпадают!")
            return
        
        print("Выберите уровень доступа:")
        print("1. Низкий (доступ только к работающим объектам)")
        print("2. Средний (доступ к работающим и неработающим)")
        print("3. Высокий (доступ ко всем объектам)")
        try:
            choice = int(input("Ваш выбор (1-3): "))
            if choice < 1 or choice > 3:
                print("Неверный выбор!")
                return
            access_levels = {1: 'low', 2: 'medium', 3: 'high'}
            access_level = access_levels[choice]
            
            user = self.register_user(username, password, access_level)
            if user:
                print(f"\nРегистрация успешна, {username}!")
                self.current_user = user
                self.show_objects_list()
            else:
                print("Ошибка регистрации!")
        except ValueError:
            print("Введите корректное число!")
    
    def show_objects_list(self):
        if not self.current_user:
            return
        print(f"ДОСТУПНЫЕ ОБЪЕКТЫ для уровня доступа {self.current_user['access_level'].upper()})")
        objects = self.get_accessible_objects(self.current_user)
        if not objects:
            print("Нет доступных объектов для просмотра")
            return
        
        for obj in objects:
            print(f"\nНазвание: {obj['name']}")
            print(f"Номер: {obj['number']}")
            status_colors = {
                'работает': 'green',
                'не работает': 'yellow',
                'критическая ошибка': 'red'
            }
            status_text = f"Статус: {obj['status']}"
            self.print_color_text(status_text, status_colors.get(obj['status'], 'reset'))
    
    def run(self):
        while True:
            self.show_menu()
            choice = input("Выберите пункт меню: ")
            if choice == '1':
                self.login()
            elif choice == '2':
                self.register()
            elif choice == '3':
                print("\nДо свидания!")
                sys.exit(0)
            else:
                print("\nНеверный выбор. Попробуйте снова.")
