import copy
import hashlib

class DataAccess:
    def __init__(self):
        self.users_db = {}
        self.objects_db = [
            {
                'name': 'ТЭЦ-3',
                'number': 'TEC-003',
                'status': 'работает'
            },
            # Транспортные объекты
            {
                'name': 'Аэропорт Толмачёво',
                'number': 'AIR-010',
                'status': 'работает'
            },
            {
                'name': 'Железнодорожный вокзал Новосибирск-Главный',
                'number': 'RWY-011',
                'status': 'работает',
                'type': 'Транспорт'
            },
            {
                'name': 'Речной вокзал Новосибирска',
                'number': 'RIV-012',
                'status': 'не работает',
                'type': 'Транспорт',
                'location': 'г. Новосибирск, Октябрьский район'
            },
            {
                'name': 'Метрополитен Новосибирска',
                'number': 'MET-013',
                'status': 'работает'
            },
            {
                'name': 'Автовокзал "Новосибирск"',
                'number': 'AVT-014',
                'status': 'критическая ошибка'
            },
            {
                'name': 'Спутниковая станция "Орбита"',
                'number': 'SAT-017',
                'status': 'критическая ошибка'
            },
            {
                'name': 'Новосибирский завод химконцентратов',
                'number': 'HIM-019',
                'status': 'не работает'
            },
            {
                'name': 'Государственная областная клиническая больница',
                'number': 'MED-022',
                'status': 'работает'
            },
            {
                'name': 'Академгородок',
                'number': 'RAN-026',
                'status': 'работает'
            }
        ]
        self._create_test_users()
    def _hash_password(self, password):
        return hashlib.sha256(password.encode()).hexdigest()
    def _create_test_users(self):
        self.create_user('admin', self._hash_password('admin123'), 'high')
        self.create_user('spec', self._hash_password('speq123'), 'medium')
        self.create_user('guest', self._hash_password('guest123'), 'low')
    def get_user(self, username):
        if username in self.users_db:
            return copy.deepcopy(self.users_db[username])  
        return None
    def create_user(self, username, hashed_password, access_level):
        if username in self.users_db:
            return None
        user = {
            'username': username,
            'password': hashed_password,
            'access_level': access_level
        }
        self.users_db[username] = copy.deepcopy(user)
        user_without_password = user.copy()
        del user_without_password['password']
        return user_without_password
    def get_all_objects(self):
        return copy.deepcopy(self.objects_db)
