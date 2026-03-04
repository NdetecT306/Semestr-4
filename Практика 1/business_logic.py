from data_access import DataAccess
import hashlib

class BusinessLogic:
    def __init__(self):
        self.data_access = DataAccess()
    def _hash_password(self, password):
        return hashlib.sha256(password.encode()).hexdigest()
    def authenticate_user(self, username, password):
        user = self.data_access.get_user(username)
        if user and user['password'] == self._hash_password(password):
            return {
                'username': user['username'],
                'access_level': user['access_level']
            }
        return None
    def user_exists(self, username):
        return self.data_access.get_user(username) is not None
    def register_user(self, username, password, access_level):
        if not username or len(username.strip()) == 0:
            return None
        if not password or len(password) < 4:
            return None
        if access_level not in ['low', 'medium', 'high']:
            return None
        hashed_password = self._hash_password(password)
        # Создаем пользователя в БД
        user = self.data_access.create_user(username, hashed_password, access_level)
        if user:
            return {
                'username': user['username'],
                'access_level': user['access_level']
            }
        return None
    def get_accessible_objects(self, user):
        if not user:
            return []
        all_objects = self.data_access.get_all_objects()
        user_level = user['access_level']
        # Фильтрация объектов по статусу на основе уровня доступа
        if user_level == 'high':
            # Высокий уровень - видит все объекты
            return all_objects
        elif user_level == 'medium':
            # Средний уровень - видит работающие и неработающие
            return [obj for obj in all_objects if obj['status'] in ['работает', 'не работает']]
        elif user_level == 'low':
            # Низкий уровень - видит только работающие
            return [obj for obj in all_objects if obj['status'] == 'работает']
        return []
