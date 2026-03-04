from business_logic import BusinessLogic
import sys
import getpass  

class Presentation:
    def __init__(self):
        self.business_logic = BusinessLogic()
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
    def login(self):
        print("\nВХОД В СИСТЕМУ")
        username = input("Имя пользователя: ")
        password = getpass.getpass("Пароль: ")  
        user = self.business_logic.authenticate_user(username, password)
        if user:
            self.current_user = user
            print(f"\nДобро пожаловать, {username}!")
            self.show_objects_list()
        else:
            print("\nНеверное имя пользователя или пароль!")
    def register(self):
        print("\nРЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ")
        # Проверка имени пользователя
        username = input("Имя пользователя: ")
        if not username or len(username.strip()) == 0:
            print("Имя пользователя не может быть пустым!")
            return
        # Проверка, не занято ли имя
        if self.business_logic.user_exists(username):
            print("Пользователь с таким именем уже существует!")
            return
        # Ввод и проверка пароля
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
            # Регистрируем пользователя
            user = self.business_logic.register_user(username, password, access_level)
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
        objects = self.business_logic.get_accessible_objects(self.current_user)
        if not objects:
            print("Нет доступных объектов для просмотра")
            return
        # Статистика по объектам
        status_counts = {'работает': 0, 'не работает': 0, 'критическая ошибка': 0}
        for obj in objects:
            print(f"\nНазвание: {obj['name']}")
            print(f"Номер: {obj['number']}")
            # Цветовая индикация статуса
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
