# CardsOnline
Классическая карточная игра "Fool"(Дурак) с поддержкой мультиплеера

DEMO: https://www.youtube.com/watch?v=6EYcq5MvrAk
![Снимок1](https://github.com/xxxform/CardsOnline/assets/26012820/66dbd818-909a-458a-ab29-8476eb543a5e)

Используемые технологии:

Сервер

  Express.js - раздача dist статики
  
  WS - работа с Websocket
  
  ES6 *Generators - организация потоков асинхронных сообщений
  
Клиент

  Vue.js
  
  Websocket



Установка - npm i

Запуск сервера - npm run start

Подключение

С локального компьютера

http://localhost

С устройства в локальной сети:

http://{{ip адрес сервера в локальной сети}}?serverip={{ip адрес сервера в локальной сети}}
