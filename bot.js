const Discord = module.require("discord.js");
const { Client, Util } = require('discord.js');
const client = new Client()
const YouTube = require('simple-youtube-api');
const ytdl = require('ytdl-core');
const fs = require("fs");
client.login("NjIwMjc5MzcyOTQ2OTk3MjY5.XXYsLA.FN2K5Wd3WKUzSnQPCb2IPa2bZO0"); //Ваш токен тут

const prefix = "+"
const queue = new Map();

const youtube = new YouTube("AIzaSyCIsbMntCEpzNx5iPJqzvOeXoaMhlc-UuU"); //Ваш API YouTube, как его получить написано ниже
client.on('ready', () => {
    client.user.setGame('Fortnite') //Ваша игра тут.
    console.log('Музыкальный бот активирован!!')
    console.log('Бот активирован!')

client.on('message', (message) => { //Проверка активности бота, вы можете убрать это
  if(message.content == "бот")
  {
  message.reply("Внимательно слушаю, мой господин.")
  }
});

client.on('message', (message) => {
  if(message.content == prefix + "инвайт")
  {
    message.channel.createInvite({temporary : true})
    .then(inv => message.channel.sendMessage (`https://discord.gg/${inv.code}`));
  }
});

client.on("guildMemberAdd", (member) => { //Выдача роли новозашедшим, уберите если это вам не нужно.
  let role = member.guild.roles.find(r => r.name === " ");
  member.addRole(role).catch(console.error);
});

client.on('guildMemberAdd', member => {
  member.guild.channels.get(' ').send(`:tada:  **Вау-вау, поприветствуем новичка  ${member.user.username}**`); //Нужно скопировать ID канала в который будет писаться приветствие
  member.guild.channels.get(' ').send(`:revolving_hearts:   **Отличного времяпровождения на сервере!**`); //Как это сделать смотрите в теме
});

client.on('message', async msg => {
    if (msg.author.bot) return undefined;
    if (!msg.content.startsWith(prefix)) return undefined;

    const args = msg.content.split(' ');
    const searchString = args.slice(1).join(' ');
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
    const serverQueue = queue.get(msg.guild.id);

    let command = msg.content.toLowerCase().split(' ')[0];
    command = command.slice(prefix.length)

    if (command === 'музыка') {
        const voiceChannel = msg.member.voiceChannel;
        if (!voiceChannel) return msg.channel.send(':x:  **Вы не находитесь в голосовом канале!**');
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if (!permissions.has('CONNECT')) {
            return msg.channel.send(':x:  **У меня нет прав подключиться к голосовому каналу!**');
        }
        if (!permissions.has('SPEAK')) {
            return msg.channel.send(':x:  **У меня нет прав говорить в голосовому каналу!**');
        }

        if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
            const playlist = await youtube.getPlaylist(url);
            const videos = await playlist.getVideos();
            for (const video of Object.values(videos)) {
                const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop
                await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop
            }
            return msg.channel.send(` Плэйлист **${playlist.title}** был добавлен!`);
        } else {
            try {
                var video = await youtube.getVideo(url);
            } catch (error) {
                try {
                    var videos = await youtube.searchVideos(searchString, 10);
                    let index = 0;
                    msg.channel.send(`
__**Выберите название видео:**__
${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}
Напишите номер трека от 1 до 10.
                    `);
                    try {
                        var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                            maxMatches: 1,
                            time: 10000,
                            errors: ['time']
                        });
                    } catch (err) {
                        console.error(err);
                        return msg.channel.send(':x: Введите число от 1 до 10!');
                    }
                    const videoIndex = parseInt(response.first().content);
                    var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
                } catch (err) {
                    console.error(err);
                    return msg.channel.send(' **Ошибка, сообщите разработчику!**');
                }
            }
            return handleVideo(video, msg, voiceChannel);
        }
    } else if (command === 'скип') {
        if (!msg.member.voiceChannel) return msg.channel.send(':x:  **Вы должны находиться в голосовом канале!**');
        if (!serverQueue) return msg.channel.send(':x: **Песен нет!**');
        serverQueue.connection.dispatcher.end(' **Скип**');
        return undefined;
    } else if (command === 'стоп') {
        if(!message.member.hasPermission('ADMINISTRATOR'))return(message.channel.send(`:x: **У вас нет прав!**`))
        if (!msg.member.voiceChannel) return msg.channel.send(':x: **Вы должны находиться в голосовом канале!**');
        if (!serverQueue) return msg.channel.send(':x: **Песен нет!**');
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end(' **Стоп!**');
        return undefined;
      }

 
async function handleVideo(video, msg, voiceChannel, playlist = false) {
    const serverQueue = queue.get(msg.guild.id);
    console.log(video);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
        queue.set(msg.guild.id, queueConstruct);

        queueConstruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(msg.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`Ошибка: ${error}`);
            queue.delete(msg.guild.id);
            return msg.channel.send(` **Ошибка, сообщите разработчику!**`);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        if (playlist) return undefined;
        else return msg.channel.send(` Песня **${song.title} была добавлена в очередь!`);
    }
    return undefined;
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);

    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    console.log(serverQueue.songs);

    const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
        .on('end', reason => {
            if (reason === ':x:  **Поток генерируется не так быстро, пожалуйста подождите**') console.log('Song ended.');
            else console.log(reason);
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 3);

    serverQueue.textChannel.send(` Сейчас играет: **${song.title}**`);
}

client.on('message', message => {
if(message.content.startsWith(prefix + 'варн')){

  if (!message.member.hasPermission('KICK_MEMBERS'))return(message.channel.send(`:x:  **У вас нет прав!**`))
  let towarn = message.mentions.members.first()
  if (!towarn)return(message.channel.send(`:x:  **Укажите никнейм!**`))
  if(towarn.hasPermission("KICK_MEMBERS")) return message.channel.send(":x:  Вы не можете наказать игрока с такими же правами!");

message.channel.bulkDelete(1)
message.channel.send(`:exclamation: **Администратор ${message.author.username} предупредил ${towarn.user.username}**`)
towarn.sendMessage(`**Вам выдано предупреждение!**`)
  }
})


client.on('message', message => {
if(message.content.startsWith(prefix + "бан")){

  if(!message.member.hasPermission('BAN_MEMBERS'))return(message.channel.send(`:x:  **У вас нет прав!**`))
  let toban = message.mentions.members.first()
  if(!toban)return(message.channel.send(`:x:  **Укажите никнейм!**`))
  if(toban.hasPermission("BAN_MEMBERS")) return message.channel.send(":x:  Вы не можете наказать игрока с такими же правами!");

toban.sendMessage(`**Вы были заблокированы!**`)
  message.channel.bulkDelete(1)
toban.ban()
message.channel.send(`:exclamation: **Администратор ${message.author.username} заблокировал ${toban.user.username}**`)
  }
})


client.on('message', message => {
if(message.content.startsWith(prefix + 'кик')){

  if(!message.member.hasPermission('KICK_MEMBERS'))return(message.channel.send(`:x:  **У вас нет прав!**`))
  let tokick = message.mentions.members.first()
  if(!tokick)return(message.channel.send(`:x:  **Укажите никнейм!**`))
  if(tokick.hasPermission("KICK_MEMBERS")) return message.channel.send(":x:  Вы не можете наказать игрока с такими же правами!");

tokick.sendMessage(`**Вас изгнали!**`)
  message.channel.bulkDelete(1)
  tokick.kick()
  message.channel.send(`:exclamation: **Администратор ${message.author.username} изгнал ${tokick.user.username}**`)
  }
})


client.on('message', message => {
    if(message.content.startsWith(prefix + "мут")){
 
    if(message.author.bot || message.channel.type == "dm" || !message.content.startsWith(prefix))return
    let args = message.content.slice(prefix.length).trim().split(' ')
 
 
    if(!message.member.hasPermission('MANAGE_MESSAGES'))return(message.channel.send(":x:  У вас нет прав!"))
    let tomute = message.mentions.members.first()
    if(!tomute)return(message.channel.send(":x:  Укажите никнейм!"))
    if(tomute.hasPermission("MANAGE_MESSAGES")) return message.channel.send(":x:  Вы не можете наказать игрока с такими же правами!");
    let muterole = message.guild.roles.find(role  =>  role.name  ==="muted")
    if(!muterole)return(message.channel.send(":x:  Роль мута была переменована или еще не создана!"))
 
    let mutetime = args[2]
    if(!mutetime)return(message.channel.send(":x:  Укажите время наказания"))
 
    tomute.addRole(muterole.id).catch(console.log("Role was added lul"))
    tomute.sendMessage(`**Вам выдан мут!**`)
    message.channel.send(`:exclamation: **Администратор ${message.author.username} выдал мут ${tomute.user.username} длительность ${ms(ms(mutetime))}**`)
 
    setTimeout(function(){
      tomute.removeRole(muterole.id)
      message.channel.send(`:exclamation: **У ${tomute.user.username} снова есть возможность общаться!**`)
    }, ms(mutetime))
  }
})

client.on('message', message => {
if(message.content.startsWith(prefix + "Спамбб")){

if(message.author.bot || message.channel.type == "dm" || !message.content.startsWith(prefix))return
let args = message.content.slice(prefix.length).trim().split(' ')

 
client.on('message', message => {
if(message.content.startsWith(prefix + "Спамбб")){

if(!message.member.hasPermission("MANAGE_MESSAGES"))return(message.channel.send(`:x: **У вас нет прав!**`))
let howmanydelete = args[1]
if(!howmanydelete)return(message.channel.send(`:x: **Количество сообщений не указано**`))

if(howmanydelete < 1)return(message.channel.send(`:x: **Не мельше одного сообщения**`))
if(howmanydelete > 100)return(message.channel.send(`:x: **Не больше ста сообщений**`))

    message.channel.bulkDelete(howmanydelete);
    message.channel.send(`:exclamation: **Администратор ${message.author.username} удалил** \`${howmanydelete}\` **сообщений**`)
   }
  }
)


if (message.content.startsWith(prefix + "музыка")) {
  execute(message, serverQueue);
  return;
} else if (message.content.startsWith(prefix + "скип")) {
  skip(message, serverQueue);
  return;
} else if (message.content.startsWith(prefix + "бан")) {
  return;
} else if (message.content.startsWith(prefix + "кик")) {
  return;
} else if (message.content.startsWith(prefix + "варн")) {
  return;
} else if (message.content.startsWith(prefix + "мут")) {
  return;
} else if (message.content.startsWith(prefix + "инвайт")) {
  return;
} else {
  message.channel.send(':x:  Такой команды не существует!**')
}
}
})
})
})
module.exports.run = async (bot,message,arge) => {
    message.channel.send('pong!');
};
module.exports.help = {
    name: "ping"
};
