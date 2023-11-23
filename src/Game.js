function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const values = ['6','7','8','9','10','В','Д','К','Т']
const allCards = [
    ...['♠', '♥', '♣', '♦'].map(suit => 
        values.map(name => ({suit, name}))
    )
].flat(1);

//перевод 10ки в 11ричную, она 'а'. остальные сравниваются по utf коду
const toNum = name => (+name || name).toString(11); 

module.exports = class Game {
    constructor() {
        this.password = '';
        this.players = [];
        this.playersReady = 0;
        //this.dump = []; //сброс
        this.desk = []; //стол
        this.deck = []; //колода
        this.started = false;
        this.trump = ''; // ♠ ♥ ♣ ♦   ♤ ♡ ♧ ♢
        this.id = Date.now();
    }
    
    //событие выбора козыря обязательно

    join(user) {
        if (this.players.length > 5) return;
        user.cards = [];
        user.ready = false;
        this.players.push(user);
        
        for (const userTo of this.players) {
            if (user !== userTo)
                userTo.socket.send(JSON.stringify({
                    event: 'addUser', data: {name: user.name, ready: user.ready}
                })); 
        }
        for (const userTo of this.players) {
            user.socket.send(JSON.stringify({
                event: 'addUser', data: {name: userTo.name, ready: userTo.ready}
            })); 
        }
    }

    leave(user) {
        this.players.splice(this.players.indexOf(user), 1);

        for (const userTo of this.players) {
            if (user !== userTo)
                userTo.socket.send(JSON.stringify({
                    event: 'remUser', data: {name: user.name}
                })); 
        }

        if (this.started) 
            this.gameOver(user);
    }

    async start() {
        this.deck = this.getRandomCards();
        this.desk.length = 0;

        this.trump = this.deck[0].suit;
        let lowerTrump = '0';
        let firstPlayerIndex = null;

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            player.cards.length = 0;

            player.socket.send(JSON.stringify({event: 'info', data: {
                type: 'gameStatus',
                started: true
            }}));

            for (let j = 0; j < 6; j++) {
                const card = this.deck.pop();

                if (card.suit === this.trump 
                    && toNum(card.name) > toNum(lowerTrump)) {
                        firstPlayerIndex = i;
                        lowerTrump = card.name
                }

                player.cards.push(card);

                player.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: 'player',
                    name: player.name,
                    card
                }}));
            }
            
            for (const playerTo of this.players) {
                if (player === playerTo) continue;

                player.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: 'player',
                    name: playerTo.name,
                    card: 6
                }}));
            }
        }

        for (const player of this.players) {
            if (this.deck.length) {
                player.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: 'deck',
                    card: this.deck[0]
                }}));
                if (this.deck.length > 1)
                    player.socket.send(JSON.stringify({event: 'addCard', data: {
                        type: 'deck',
                        card: this.deck.length - 1
                    }}));
            } 

            player.socket.send(JSON.stringify({event: 'setTrump', data: this.trump}));

            this.changeStatus(player);
        }
        
        this.gameLoop(firstPlayerIndex === null ? getRandomInt(0, this.players.length - 1) : firstPlayerIndex, true)
            .catch(e => e === Symbol.for('gameOver') ? null : Promise.reject(e));
    }

    get countOfPlayersInGame() {
        return this.players.reduce((summ, player) => summ += !!player.cards.length, 0);
    }

    getNextPlayer(currentPlayerIndex) {
        const player = this.players[currentPlayerIndex % this.players.length];
        let nextPlayer;

        while(player !== nextPlayer) {
            if (nextPlayer?.cards?.length) break;
            nextPlayer = this.players[++currentPlayerIndex % this.players.length];
        }

        return [nextPlayer, currentPlayerIndex % this.players.length];
    }

    gameOver(player) {
        for (const playerTo of this.players) {
            playerTo.socket.send(JSON.stringify({event: 'info', data: {
                type: 'gameStatus',
                started: false,
                fool: !this.countOfPlayersInGame ? '' : player.name
            }}));

            playerTo.socket.emit('message', JSON.stringify({event: 'gameOver'}));

            if (playerTo.ready) this.changeStatus(player);
        }

        this.started = false;
    }

    playerAttackBroadcast(player, card) {
        for (const playerTo of this.players) {
            playerTo.socket.send(JSON.stringify({event: 'remCard', data: {
                type: 'player',
                name: player.name,
                card: playerTo === player ? card : 1
            }})); 

            playerTo.socket.send(JSON.stringify({event: 'addCard', data: {
                type: 'desk', card
            }})); 
        }
    }

    playerTakeBroadcast(player, cards) {
        for (const card of cards) {
            player.socket.send(JSON.stringify({event: 'addCard', data: {
                type: 'player',
                name: player.name,
                card: card
            }})); 
        }

        for (const playerTo of this.players) {
            playerTo.socket.send(JSON.stringify({event: 'remCard', data: {
                type: 'desk', card: cards.length
            }})); 

            if (player !== playerTo)
                playerTo.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: 'player',
                    name: player.name,
                    card: cards.length
                }})); 
        }
    }

    isBito(attackCards, defenceCards) { //вернёт количество карт которое было отбито
        defenceCards = Array.from(defenceCards)
            .sort((a,b) => toNum(a.name) < toNum(b.name) ? 1 : -1)
            .sort((a,b) => a.suit > b.suit ? 1 : -1);

        let count = 0;
        
        for(const card of attackCards) {
            let defCardIndex = defenceCards.findIndex(defCard => defCard.suit === card.suit && toNum(defCard.name) > toNum(card.name));

            if (card.suit !== this.trump && !~defCardIndex) 
                defCardIndex = defenceCards.findIndex(defCard => defCard.suit === this.trump);

            if (~defCardIndex) {
                defenceCards.splice(defCardIndex, 1);
                count++;
            }
        }

        return count;
    }

    //ждёт пока все игроки подкинут если есть
    async waitAllAdditionCards(addCardsPlayers, defencePlayer, allAttackCards, allDefenceCards) { 
        const allCards = allAttackCards.concat(allDefenceCards);
        const playersCanAdd = addCardsPlayers.filter(player => player.cards.some(card => allCards.some(acard => acard.name === card.name)));
        const playerGenerators = [];

        //setTimeout(() => playerGenerators.forEach(gen => gen.next(true)), 15000);
        const checkDefencePlayerOverflow = () => {
            return allAttackCards.length >= 6 || allAttackCards.length >= defencePlayer.cards.length;
        }
        if (checkDefencePlayerOverflow()) return;

        for (let playerAdd of playersCanAdd) {
            const playerCardsGenerator = this.waitCards(playerAdd);
            playerGenerators.push(playerCardsGenerator);

            for (let card of playerCardsGenerator) {
                card = await card;
                if (card === Symbol.for('break')) break;
                if (!card) { playerCardsGenerator.next(true); break }
                if (allCards.length && !allCards.some(pcard => card.name === pcard.name)) continue;

                if (checkDefencePlayerOverflow()) 
                    return playerGenerators.forEach(gen => gen.next(true));
                
                playerAdd.cards.splice(playerAdd.cards.indexOf(card), 1);
                allAttackCards.push(card);
                this.playerAttackBroadcast(playerAdd, card);

                if (checkDefencePlayerOverflow()) 
                    return playerGenerators.forEach(gen => gen.next(true));

                if (!playerAdd.cards.some(pcard => card.name === pcard.name)) 
                    playerCardsGenerator.next(true);
            }
        }
    }

    /*
        генератор событий step пользователя player
        после next(!!value) генератор сворачивается
        все незавершенные промисы будут завершены значением value
    */
    *waitCards(player) {
        const rejects = [];
        const resolves = [];

        const handler = message => {
            message = JSON.parse(message);
            if (message.event === 'gameOver') {
                rejects.forEach(rej => rej(Symbol.for('gameOver')));
                player.socket.removeListener('message', handler);
                return;
            }
            if (message.event !== 'step') return;

            const card = message.card ? player.cards.find(card => 
                card.suit === message.card.suit && card.name === message.card.name) : null;

            (resolves.pop() || (()=>{}))(card);
            rejects.pop();
        }

        player.socket.on('message', handler);
        this.changeStatus(player);

        let result;
        while (!(result = yield new Promise((resolve, reject) => {
            resolves.push(resolve);
            rejects.push(reject);
        }))) {};
    
        player.socket.removeListener('message', handler);
        resolves.forEach(res => res(Symbol.for('break')));
        this.changeStatus(player);
        return result;
    }

    async gameLoop(currentPlayerIndex, isFirst = false) {
        const player = this.players[currentPlayerIndex];
        const [defencePlayer, defencePlayerIndex] = this.getNextPlayer(currentPlayerIndex);

        if (player === defencePlayer) 
            return this.gameOver(player);

        for (const userTo of this.players) 
            userTo.socket.send(JSON.stringify({event: 'info', data: {
                type: 'defencePlayer',
                name: defencePlayer.name
            }}));
        
        const allAttackCards = []; // max length 6 
        const allDefenceCards = [];

        //атака player'ом defencePlayer'а
        {
            const playerCardsGenerator = this.waitCards(player);
            //setTimeout(() => playerCardsGenerator.next(true), 15000);
    
            for (let card of playerCardsGenerator) {
                card = await card;
                if (!card && allAttackCards.length) { //игрок не захотел подкидывать дальше 
                    playerCardsGenerator.next(true); 
                    break;
                } 
                if (!card || card === Symbol.for('break'))  //timeout
                    card = player.cards[0];

                if (allAttackCards.length && !allAttackCards.some(pcard => card.name === pcard.name)) continue;
    
                player.cards.splice(player.cards.indexOf(card), 1);
                allAttackCards.push(card);
                this.playerAttackBroadcast(player, card);
                
                //больше нечего подкидывать/отбивающемуся больше нечем отбиваться
                if (card && (!player.cards.some(pcard => card.name === pcard.name) || allAttackCards.length >= defencePlayer.cards.length)) {
                    playerCardsGenerator.next(true); 
                }
            }   
            playerCardsGenerator.next(true);
        }

        //оборона
        {
            let timer = null;
            let playerTake = false;
            let lastBito = 0;

            //пока все карты не побиты
            outer: while(this.isBito(allAttackCards, allDefenceCards) !== allAttackCards.length) {
                const defencePlayerCardsGenerator = this.waitCards(defencePlayer);
                if (this.isBito(allAttackCards, defencePlayer.cards.concat(allDefenceCards)) < allAttackCards.length) {
                    playerTake = true; //нечем биться, берёт
                    break;
                }

                timer// = setTimeout(() => playerCardsGenerator.next(true), 15000);

                for (let card of defencePlayerCardsGenerator) {
                    card = await card;
                    if (!card || card === Symbol.for('break')) { //берёт
                        playerTake = true;
                        defencePlayerCardsGenerator.next(true);
                        break outer; 
                    }
                    //положил неподходящую карту. ждём подходящую
                    let newBito = this.isBito(allAttackCards, allDefenceCards.concat([card]));
                    if (newBito <= lastBito) continue; 
                    lastBito = newBito;

                    defencePlayer.cards.splice(defencePlayer.cards.indexOf(card), 1);
                    allDefenceCards.push(card);
                    this.playerAttackBroadcast(defencePlayer, card);

                    if (allAttackCards.length === allDefenceCards.length) {
                        defencePlayerCardsGenerator.next(true); //отбился
                    }
                }

                clearTimeout(timer);
                await this.waitAllAdditionCards(this.players.filter(user => defencePlayer !== user), defencePlayer, allAttackCards, allDefenceCards);
            }

            //defencePlayerCardsGenerator.next(true);

            if (playerTake) {
                await this.waitAllAdditionCards(this.players.filter(user => ![defencePlayer].includes(user)), defencePlayer, allAttackCards, allDefenceCards);
                this.playerTakeBroadcast(defencePlayer, allAttackCards.concat(allDefenceCards));
                defencePlayer.cards.push(...allAttackCards, ...allDefenceCards);
            } else {
                for (const playerTo of this.players) {
                    playerTo.socket.send(JSON.stringify({event: 'remCard', data: {
                        type: 'desk', card: allAttackCards.length + allDefenceCards.length
                    }}));
                    playerTo.socket.send(JSON.stringify({event: 'addCard', data: {
                        type: 'dump', card: allAttackCards.length + allDefenceCards.length
                    }}));
                }
            }

            // раздать. первый берет всегда атакующий. последний берет тот кто бился. 
            const players = Array.from(this.players);
            players.splice(defencePlayerIndex, 1);
            const queue = players.splice(currentPlayerIndex).concat(players);
            queue.push(defencePlayer);

            for (let i = 0; i < queue.length; i++) {
                const player = queue[i];
                if (player.cards.length > 5) continue;

                let cardsToAdd = 6 - player.cards.length;
                if (cardsToAdd < 0) cardsToAdd = 0;
                if (this.deck.length - cardsToAdd < 0) cardsToAdd = this.deck.length;

                if (cardsToAdd > 0)
                    for (const playerTo of this.players) {
                        playerTo.socket.send(JSON.stringify({event: 'remCard', data: {
                            type: 'deck',
                            card: cardsToAdd
                        }}));

                        if (playerTo !== player)
                            playerTo.socket.send(JSON.stringify({event: 'addCard', data: {
                                type: 'player',
                                name: player.name,
                                card: cardsToAdd
                            }}));
                    }

                while (cardsToAdd-- > 0) {
                    const card = this.deck.pop();
                    player.cards.push(card);
                    
                    player.socket.send(JSON.stringify({event: 'addCard', data: {
                        type: 'player',
                        name: player.name,
                        card
                    }}));
                }

                if (!this.deck.length) break;
            }

            return this.gameLoop(this.getNextPlayer(playerTake ? defencePlayerIndex : currentPlayerIndex)[1]); 
        }
    }

    getRandomCards() {
        return Array.from(allCards).sort(() => Math.random() > .5 ? 1 : -1);
    }

    changeStatus(user) {
        user.ready = !user.ready;
        this.playersReady += user.ready ? 1 : -1;

        for (const userTo of this.players) {
            userTo.socket.send(JSON.stringify({event: 'changeStatus', data: {
                type: 'player',
                name: user.name,
                ready: user.ready
            }}));
        }

        if (!this.started && this.playersReady === this.players.length && this.playersReady > 1) {
            this.started = true;
            this.start();
        }
    }

    sendState(user) {
        for (const field of this.fields) {
            user.socket.send(JSON.stringify({event: 'addField', data: {
                type: field.type,
                name: field.name,
                enabled: field.enabled
            }}));

            if (!field.cards.length) continue;

            if (field.type === 'deck') {
                user.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: field.type,
                    card: {
                        suit: field.cards[0].suit,
                        name: field.cards[0].name
                    }
                }}));

                if (field.cards.length > 1) 
                    user.socket.send(JSON.stringify({event: 'addCard', data: {
                        type: 'deck',
                        card: field.cards.length - 1
                    }}));

                continue;
            }

            if (field.type === 'player' && field.name !== user.name) {
                user.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: field.type,
                    name: field.name,
                    card: field.cards.length
                }}));

                continue;
            }

            for (let i = 0; i < field.cards.length; i++) 
                user.socket.send(JSON.stringify({event: 'addCard', data: {
                    type: field.type,
                    name: field.name,
                    card: field.cards[i]
                }}));
        }
    }
}