<template>
    <div class="gameWrapper">
        <button class="buttonLeave" @click="leaveGame">Выйти</button>
        <div class="circleOfPlayers">
            <span class="playerField" v-for="(user, i) in players" :class="{'me': user.me}">
                <button @click="action" v-if="user.me" class="action" v-show="!started || user.ready">{{ !started ? 'Готов' : user.defence ? 'Беру' : 'Пас' }}</button>
                <p class="userName" :class="{'ready': user.ready}" >{{ user.name }} {{ user.defence ? '🛡' : '' }}</p>
                <p class="cards">
                    <span @click="user.me ? step(card) : null" v-for="card in user[user.me ? 'sortedCards' : 'cards']">
                        <span class="card" :class="{'hidden': !card.suit, 'red': card.suit === '♥' || card.suit ==='♦'}">
                            <template v-if="card.suit">
                                <span class="nameUp">{{ card.name }} <br>  <span class="suit">{{ card.suit }}</span></span>
                                <span class="nameDown">{{ card.name }}<br> <span class="suit">{{ card.suit }}</span></span>
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
                    <span v-for="card in deck">
                        <span class="card" :class="{'red': card.suit === '♥' || card.suit ==='♦'}">
                            <template v-if="card.suit">
                                <span class="nameUp">{{ card.name }} <br>  <span class="suit">{{ card.suit }}</span></span>
                                <span class="nameDown">{{ card.name }}<br> <span class="suit">{{ card.suit }}</span></span>
                            </template>
                        </span>
                    </span>
                </div>
            </div>
            <div class="desk">
                <div class="cards">
                    <span v-for="card in desk">
                        <span class="card" :class="{'red': card.suit === '♥' || card.suit ==='♦'}">
                            <span class="nameUp">{{ card.name }} <br>  <span class="suit">{{ card.suit }}</span></span>
                            <span class="nameDown">{{ card.name }}<br> <span class="suit">{{ card.suit }}</span></span>
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
import { computed } from 'vue';
const toNum = name => (+name || name).toString(11);

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
            
            if (message.event === 'addUser') {
                this.users.push(Object.assign(message.data, {cards: []}));
                const user = this.users[this.users.length - 1];
                if (user.name === this.username) {
                    user.me = true;
                    user.sortedCards = computed(() => {
                        return user.cards
                            .toSorted((a,b) => toNum(a.name) < toNum(b.name) ? 1 : -1)
                            .toSorted((a,b) => a.suit > b.suit ? 1 : -1)
                            .toSorted((a,b) => 
                                a.suit === this.trump ^ b.suit === this.trump 
                                    ? a.suit === this.trump ? 1 : -1 
                                    : 0
                            );
                    });
                }
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
                if (!user) return;
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
                        this.deck.length = this.desk.length = this.dump.length = 0;
                        for (let player of this.users) player.cards.length = 0;
                        
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
    computed: {
        players() { //сдвинутый массив users где текущий пользователь первый
            const thisUserIndex = this.users.findIndex(user => user.name === this.username);
            const a = [...this.users];
            return a.splice(thisUserIndex).concat(a);
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
        text-align: center;
        font-size: 3em;
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
        }

        > .dump {
            width: 15vw;
            height: 40vh;
        }
        
        > .deck {
            width: 15vw;
            height: 23vh;
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
                left: 1em;
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
            > .card.red .suit {
                color: red;
            }
            > .card {
                position: absolute;
                aspect-ratio: 2/3;
                min-width: 20%;
                height: 100%;
                display: inline-block;
                border: 1px solid black;
                background-color: white;
                font-size: 3vh;

                .nameUp {
                    position: absolute;
                    top: 4%;
                    left: 8%;
                    text-align: center;
                }
                
                .nameDown {
                    transform: rotate(180deg);
                    position: absolute;
                    bottom: 4%;
                    right: 8%;
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
        top: -6vh;
        left: 40vw;
        right: 40vw;
        font-size: 2em;
    }
    .ready {
        background-color: green;
    }
</style>