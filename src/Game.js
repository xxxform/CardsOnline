function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getOverflowIndex = (i, arrLength) => (i % arrLength + arrLength) % arrLength;

const values = ['6','7','8','9','10','В','Д','К','Т']
const allCards = [
    ...['♠', '♥', '♣', '♦'].map(suit => 
        values.map(name => ({suit, name}))
    )
].flat(1);

const toNum = name => (+name || name).toString(11); //перевод 10ки в 11ричную а

module.exports = class Game {
    constructor() {
        this.password = '';
        this.players = [];
        this.playersReady = 0;
        this.dump = []; //сброс
        this.desc = []; //стол
        this.deck = []; //колода
        this.started = false;
        this.trump = ''; // ♠ ♥ ♣ ♦   ♤ ♡ ♧ ♢
    }
    
    //событие выбора козыря обязательно

    join(user) {
        if (this.players.length > 5) return;
        user.cards = [];
        user.ready = false;
        this.players.push(user);

        for (const user of this.players) {
            user.socket.send(JSON.stringify({event: 'addUser', data: {name: user.name, ready: false}})); 
        }

        //this.sendState(user);
    }

    async start() {
        this.deck = this.getRandomCards();
        this.trump = this.deck[0].suit;
        let lowerTrump = '00';
        let firstPlayerIndex = null;

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];

            for (let i = 0; i < 6; i++) {
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
        //todo проверить чтобы не было 5 карт одной масти
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
        
        this.gameLoop(firstPlayerIndex === null ? getRandomInt(0, this.players.length - 1) : firstPlayerIndex, true);
    }

    get countOfPlayersInGame() {
        return this.players.reduce((summ, player) => summ += !!player.cards.length, 0);
    }

    getNextPlayer(currentPlayerIndex) {
        const player = this.players[getOverflowIndex(currentPlayerIndex, this.players.length)];
        let nextPlayer = this.players[getOverflowIndex(++currentPlayerIndex, this.players.length)];

        while(player !== nextPlayer || !nextPlayer?.length) {
            nextPlayer = this.players[getOverflowIndex(++currentPlayerIndex, this.players.length)]
        }

        return [nextPlayer, currentPlayerIndex];
    }

    gameOver(player) {
        for (const playerTo of this.players) {
            playerTo.socket.send(JSON.stringify({event: 'gameOver', data: {
                fool: !this.countOfPlayersInGame ? '' : player.name
            }})); 
        }
    }

    playerAttackBroadcast(player, card) {
        for (const playerTo of this.players) {
            playerTo.socket.send(JSON.stringify({event: 'remCard', data: {
                type: 'player',
                name: player.name,
                card: playerTo === player ? card : 1
            }})); 

            player.socket.send(JSON.stringify({event: 'addCard', data: {
                type: 'desc', card
            }})); 
        }
    }

    playerTakeBroadcast(player, cards) {
        for (const playerTo of this.players) {
            playerTo.socket.send(JSON.stringify({event: 'remCard', data: {
                type: 'desc', card: cards.length
            }})); 

            if (player === playerTo) {
                for (const card of player.cards) {
                    playerTo.socket.send(JSON.stringify({event: 'addCard', data: {
                        type: 'player',
                        name: player.name,
                        card: card
                    }})); 
                }
                return;
            } 

            playerTo.socket.send(JSON.stringify({event: 'addCard', data: {
                type: 'player',
                name: player.name,
                card: cards.length
            }})); 
        }
    }

    toThrowExist() {}

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
        setTimeout(() => playerGenerators.forEach(gen => gen.next(true)), 15000);
        const checkDefencePlayerOverflow = () => allAttackCards.length >= 6 || allAttackCards.length >= defencePlayer.cards.length + allDefenceCards.length;
        let lastCard = null;

        for (let playerAdd of playersCanAdd) {
            const playerCardsGenerator = this.waitCards(player);
            playerGenerators.push(playerCardsGenerator);

            for (let card of playerCardsGenerator) {
                lastCard = card = await card;
                if (card === Symbol.for('break')) break;
                if (!card) { playerCardsGenerator.next(true); break }

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

        return lastCard;
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

        const allAttackCards = []; // max length 6 
        const allDefenceCards = [];

        //нельзя подкидывать больше карт чем на руке 
        //атакующий пока у него есть карты подкидывает их, защищающийся отбивается, 
        //после того как у атакующего нечем ходить вступают другие игроки 
        //проверка на победителя и проигравшего. Игра окончена если getNextPlayer вернул того же игрока
        //атака player'ом defencePlayer'а
        {
            const playerCardsGenerator = this.waitCards(player);
            setTimeout(() => playerCardsGenerator.next(true), 15000);
    
            for (let card of playerCardsGenerator) {
                card = await card;
                if (card === Symbol.for('break')) { //timeout
                    player.cards.splice(card, 1);
                    allAttackCards.push(card);
                    this.playerAttackBroadcast(player, card);
                    break;
                } 

                // игрок не захотел подкидывать дальше 
                if (!card && allAttackCards.length) { 
                    playerCardsGenerator.next(true); break; 
                }
    
                player.cards.splice(player.cards.indexOf(card), 1);
                allAttackCards.push(card);
                this.playerAttackBroadcast(player, card);
                
                //больше нечего подкидывать/отбивающемуся больше нечем отбиваться
                if (!player.cards.some(pcard => card.name === pcard.name) || defencePlayer.cards.length < 2) 
                    playerCardsGenerator.next(true);
            }
        }
        
        //оборона
        {
            const defencePlayerCardsGenerator = this.waitCards(defencePlayer);
            let timer = setTimeout(() => playerCardsGenerator.next(true), 15000);
            let bitoCards = 0;
            let playerTake = false;
            let attackPlayerIsAttack = true;

            outer: while(!playerTake) {   //нечем биться, берёт
                if (this.isBito(allAttackCards, defencePlayer.cards) < allAttackCards.length) {
                    playerTake = true;
                    break;
                }

                for (let card of defencePlayerCardsGenerator) {
                    card = await card;
                    if (!card || card === Symbol.for('break')) { //берёт
                        playerTake = true;
                        break outer; 
                    }
    
                    const newBito = this.isBito(allAttackCards, [card]);
                    if (newBito < bitoCards) continue; //положил неподходящую карту
                    bitoCards = newBito;

                    defencePlayer.cards.splice(defencePlayer.cards.indexOf(card), 1);
                    allDefenceCards.push(card);
                    this.playerAttackBroadcast(defencePlayer, card);

                    clearTimeout(timer);
                    timer = setTimeout(() => playerCardsGenerator.next(true), 15000);
                    if (allAttackCards.length > allDefenceCards.length) {

                    }
                }

                if (attackPlayerIsAttack) {
                    const lastCard = await this.waitAllAdditionCards([attackPlayer], defencePlayer, allAttackCards, allDefenceCards);
                    if (!lastCard) attackPlayerIsAttack = false;
                    await this.waitAllAdditionCards(this.players.filter(user => ![attackPlayer, defencePlayer].includes(user)), defencePlayer, allAttackCards, allDefenceCards);
                } else {
                    await this.waitAllAdditionCards(this.players.filter(user => defencePlayer !== user), defencePlayer, allAttackCards, allDefenceCards);
                }
            }  

            defencePlayerCardsGenerator.next(true);

            //раздать карты из колоды кому надо

            if (playerTake) {
                this.changeStatus(defencePlayer);
                this.changeStatus(defencePlayer);
                await this.waitAllAdditionCards([attackPlayer], defencePlayer, allAttackCards, allDefenceCards);
                await this.waitAllAdditionCards(this.players.filter(user => ![attackPlayer, defencePlayer].includes(user)), defencePlayer, allAttackCards, allDefenceCards);
                this.playerTakeBroadcast(player, allAttackCards.concat(allDefenceCards));
                
                return this.gameLoop(this.getNextPlayer(defencePlayerIndex)[1]);
            } else {
                return this.gameLoop(this.getNextPlayer(player)[1]);
            }
        }
    }

    moveCard(from, to, fromUser, toUser) {

    }

    getRandomCards() {
        return Array.from(allCards).sort(() => Math.random() > .5 ? 1 : -1);
    }

    changeStatus(user) {
        user.ready = !!(this.playersReady += (!user.ready || -1));

        for (const user of this.players) {
            user.socket.send(JSON.stringify({event: 'changeField', data: {
                type: 'player',
                name: user.name,
                ready: user.ready
            }}));
        }

        if (!this.started && this.playersReady === this.players.length) {
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

/*
if (user.role === 'spectator') {
                    user.socket.send(JSON.stringify({event: 'addCard', data: {
                        fieldType: field.type,
                        fieldName: field.name,
                        card: {
                            suit: card.suit,
                            name: card.name
                        }
                    }}));
                }
*/

