<template>
    <div class="gameWrapper">
        <button class="buttonLeave" @click="leaveGame">Выйти</button>
        <div class="circleOfPlayers">
            <span class="playerField" v-for="(user, i) in users" :class="{'me': user.name === username}">
                <button @click="action" v-if="user.name === username" class="action" v-show="!started || user.ready">{{ !started ? 'Готов' : user.defence ? 'Беру' : 'Пас' }}</button>
                <p class="userName" :class="{'ready': user.ready}" >{{ user.name }} {{ user.defence ? '🛡' : '' }}</p>
                <p class="cards">
                    <span @click="user.name === username ? step(card) : null" v-for="(card, i) in user.cards">
                        <span class="card" :class="{'hidden': !card.suit}">
                            <template v-if="card.suit">
                                <span class="nameUp">{{ card.name }} <br>  {{ card.suit }} </span>
                                <span class="nameDown">{{ card.name }}<br> {{ card.suit }}</span>
                            </template>
                        </span>
                    </span>
                </p>
            </span>
        </div>
        <div class="fields">
            <div class="deck">
                <div class="cardsRest" v-show="deck.length">{{ deck.length }}</div>
                <div class="trump">{{ trump }}</div>
                <div class="cards">
                    <span v-for="(card, i) in deck">
                        <span class="card">
                            <template v-if="card.suit">
                                <span class="nameUp">{{ card.name }} <br>  {{ card.suit }} </span>
                                <span class="nameDown">{{ card.name }}<br> {{ card.suit }}</span>
                            </template>
                        </span>
                    </span>
                </div>
            </div>
            <div class="desk">
                <div class="cards">
                    <span v-for="(card, i) in desk">
                        <span class="card">
                            <span class="nameUp">{{ card.name }} <br>  {{ card.suit }}</span>
                            <span class="nameDown">{{ card.name }}<br> {{ card.suit }}</span>
                        </span>
                    </span>
                </div>
            </div>
            <div class="dump">

            </div>
        </div>
        <div class="info">
            <p>{{ info }}</p>
        </div>
    </div>
</template>

<script>
//самый нижний элемент(последний добавленный append) карты в дом дереве колоды будет самым верхним по z-index
//поэтому в массив нужно делать unshift
//todo сделать при ховере z-index или при нажатии / touchmove чтобы можно было кидать карту
export default {
    data() {
        return {
            users: [],
            deck: [],
            desk: [],
            dump: [],
            trump: null,
            started: false,
            info: ''
        }
    },
    props: {
        modelValue: {type: Number},
        username: {type: String},
        socket: {type: WebSocket}
    },
    methods: {
        leaveGame() {
            this.socket.send(JSON.stringify({event: 'leave'}));
            this.$emit('update:modelValue', null); 
        },
        action() {
            this.socket.send(JSON.stringify({event: !this.started ? 'ready' : 'step'}));
        },
        step(card) {
            this.socket.send(JSON.stringify({event: 'step', card: {
                suit: card.suit,
                name: card.name
            }}));
        },
        showInfo(text, time = 4000) {
            this.info = text;
            setTimeout(() => this.info = '', time);
        },
        handler(event) {
            const message = JSON.parse(event.data);

            //['♠', '♥', '♣', '♦']
            // const cards = [
            //     {suit: '♥', name: '10'},
            //     {suit: '♦', name: 'Т'},
            //     {suit: '♠', name: 'В'}, {},
            //     {suit: '♣', name: '6'},
            // ];

            // const users = [
            //     {name: '1', cards},
            //     {name: '1'},
            //     {name: '1', cards}, 
            //     {name: '1'},
            // ]

            if (message.event === 'addUser') {
                //message.data.cards = cards;
                this.users.push(Object.assign(message.data, {cards: []}));
            } else
            if (message.event === 'remUser') {
                this.users.splice(this.users.findIndex(user => user.name === message.data.name), 1);
            } else
            if (message.event === 'addCard') {
                const cards = message.data.type === 'player' 
                    ? this.users.find(({name}) => name === message.data.name).cards
                    : this[message.data.type];
                if (message.data.card.suit) cards.push(message.data.card);
                else cards.push(...(new Array(message.data.card)).fill({}));
            } else
            if (message.event === 'remCard') {
                const cards = message.data.type === 'player' 
                    ? this.users.find(({name}) => name === message.data.name).cards
                    : this[message.data.type];

                if (message.data.card.suit) 
                    cards.splice(cards.findIndex(({name, suit}) =>
                        name === message.data.card.name && suit === message.data.card.suit), 1);
                else 
                    cards.splice(cards.length - message.data.card, message.data.card);

            } else
            if (message.event === 'changeStatus') {
                const user = this.users.find(user => user.name === message.data.name);
                user.ready = message.data.ready;
                if (this.started && user.ready && user.name === this.username) {
                    this.showInfo('Ваш ход!');
                }
            } else
            if (message.event === 'info') {
                if (message.data.type === 'defencePlayer') {
                    const prevDefencePlayer = this.users.find(user => user.defence);
                    if (prevDefencePlayer) prevDefencePlayer.defence = false;
                    const user = this.users.find(user => user.name === message.data.name);
                    user.defence = true;
                } else
                if (message.data.type === 'gameStatus') {
                    if (this.started = message.data.started) {
                        this.showInfo('Игра началась!');
                    } else {
                        this.showInfo(`Игра окончена! ${message.data.fool ? message.data.fool + ' проиграл!' : 'Ничья!'}`);
                    }
                }
            } else 
            if (message.event === 'setTrump') {
                this.trump = message.data;
            }
        }
    },
    mounted() {
        this.socket.addEventListener('message', this.handler);
    },
    unmounted() {
        this.socket.removeEventListener('message', this.handler);
    }
}
</script>

<style scoped>
    .info {
        position: absolute;
        top: 30vh;
        bottom: 40vh;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 3.5em;
    }

    .fields {
        z-index: -3;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;

        > .desk {
            width: 60vw;
            height: 40vh;
            .cards {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
                margin: 0;
                height: 100%;
                > span {
                    width: 10%;
                    position: relative;
                    > .card {
                        position: relative;
                        min-width: inherit;
                    }
                }
            }
        }

        > .dump {
            width: 15vw;
            height: 40vh;
        }
        
        > .deck {
            width: 15vw;
            height: 30vh;
            position: relative;
            .trump, .cardsRest {
                position: absolute;
                width: 100%;
                height: 100%;
                font-size: 5em;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .cardsRest {
                top: -20vh;
                font-size: 3.5em;
            }
            .cards > span {
                width: 0;
                height: 0;
            }
            .cards > span:first-child > .card {
                transform: rotate(90deg);
            }
        }
    }
    .circleOfPlayers {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        height: 30vh;
        /* align-items: center; */
        /* text-align: center; */

        .playerField {
            position: relative;
            width: 30vw;
            height: 20vh;
            background-color: grey;
            display: inline-block;
            white-space: nowrap;

            .userName{
                margin: 0;
                text-align: center;
                position: absolute;
                font-size: 1.5em;
                width: 100%;
            }
        }
    }

    .gameWrapper > .circleOfPlayers > .playerField.me {
        position: fixed;
        bottom: 0;
        width: 100%;
        height: 30vh;
        .cards {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            margin: 0;
            height: 100%;
            > span {
                width: 10%;
                position: relative;
                > .card {
                    position: relative;
                    min-width: inherit;
                }
            }
        }
        .userName {
            z-index: 2;
            position: relative;
            margin: 0;
        }
    }

    .cards {
        > span {
            width: 10%;
            display: inline-block;

            .hidden {
                background-color: bisque;
            }
            > .card {
                position: absolute;
                aspect-ratio: 2/3;
                min-width: 20%;
                height: 100%;
                display: inline-block;
                border: 1px solid black;
                background-color: white;
                font-size: 2vh;

                .nameUp {
                    position: absolute;
                    top: .5vw;
                    left: .5vw;
                    text-align: center;
                }
                
                .nameDown {
                    transform: rotate(180deg);
                    position: absolute;
                    bottom: .5vw;
                    right: .5vw;
                    text-align: center;
                }
            }
        }
    }
    
    .buttonLeave {
        position: absolute;
        z-index: 5;
    }

    button.action {
        position: absolute;
        text-align: center;
        top: -5vh;
        left: 40vw;
        right: 40vw;
        font-size: 2em;
    }
    .ready {
        background-color: green;
    }
</style>