const { Client: WhatsappClient, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { Client: DiscordClient, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const qrcode = require('qrcode-terminal');
const play = require('play-dl');
const http = require('http');

let bancoDeMemes = {};

// Mantém o projeto do Glitch acordado na internet
http.createServer((req, res) => {
    res.write("Super Bot Jake Ativo!");
    res.end();
}).listen(process.env.PORT || 3000);

const SEU_NUMERO_WHATSAPP = "5518996096029@c.us";

async function buscarConteudoInternet(termoBusca, tipo) {
    let sufixo = "meme";
    if (tipo === "filme" || tipo === "assistir") sufixo = "filme completo dublado trailer";
    if (tipo === "serie") sufixo = "serie completo dublado trailer";
    if (tipo === "anime") sufixo = "anime episodio 1 dublado";

    const resultados = await play.search(`${termoBusca} ${sufixo}`, { limit: 1 });
    if (!resultados || resultados.length === 0) throw new Error("Conteúdo não encontrado.");

    const video = resultados[0];
    const respostaImagem = await fetch(video.thumbnails[0].url);
    const arrayBuffer = await respostaImagem.arrayBuffer();
    const base64Figurinha = Buffer.from(arrayBuffer).toString('base64');

    const gatilhoFormatado = termoBusca.toLowerCase().replace(/\s+/g, '');

    bancoDeMemes[gatilhoFormatado] = {
        titulo: video.title,
        fig: base64Figurinha,
        youtubeUrl: video.url,
        tipo: tipo,
        gatilho: gatilhoFormatado
    };

    return bancoDeMemes[gatilhoFormatado];
}

// ==========================================
// MÓDULO DO WHATSAPP (Roda liso no Glitch)
// ==========================================
const waClient = new WhatsappClient({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

waClient.on('qr', qr => {
    console.log("👇 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP 👇");
    qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => console.log('✅ SUCESSO: Bot do WhatsApp conectado e ativo nos grupos!'));

waClient.on('message', async msg => {
    const texto = msg.body.toLowerCase().trim();
    if (bancoDeMemes[texto]) {
        const meme = bancoDeMemes[texto];
        if (meme.fig) await waClient.sendMessage(msg.from, new MessageMedia('image/jpeg', meme.fig), { sendMediaAsSticker: true });
        await waClient.sendMessage(msg.from, `📢 *Encontrado:* ${meme.titulo}`);
    }
});

// ==========================================
// MÓDULO DO DISCORD
// ==========================================
const dcClient = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

dcClient.on('ready', () => console.log(`✅ SUCESSO: Bot do Discord ativo como: ${dcClient.user.tag}`));

dcClient.on('messageCreate', async msg => {
    if (msg.author.bot) return;

    const mencaoBot = `<@${dcClient.user.id}>`;
    const texto = msg.content.toLowerCase();

    if (msg.content.includes(mencaoBot) || texto.startsWith('!assistir ')) {
        let busca = msg.content.replace(mencaoBot, '').replace('!assistir ', '').replace('passar o filme', '').replace('passar o anime', '').replace('passar a serie', '').trim();
        
        if (!busca) return msg.reply("🍿 Me diga o nome do filme, série ou anime que deseja assistir!");

        msg.channel.send(`🎬 Procurando por **${busca}** na internet aberta...`);

        try {
            const resultado = await buscarConteudoInternet(busca, "assistir");
            await msg.channel.send({
                content: `🍿 **Aqui está o resultado para assistir com a galera!**\n\n🎥 **Título Encontrado:** ${resultado.titulo}\n🔗 **Link:** ${resultado.youtubeUrl}\n\n💡 *Entre em um canal de voz e use o "Watch Together" com este link!*`
            });
        } catch (e) {
            msg.channel.send("❌ Não consegui encontrar links estáveis para essa mídia nas minhas fontes atuais.");
        }
        return;
    }

    if (texto.startsWith('!')) {
        const gatilho = texto.replace('!', '').trim();
        if (bancoDeMemes[gatilho]) {
            const meme = bancoDeMemes[gatilho];
            if (meme.fig) {
                const bufferFig = Buffer.from(meme.fig, 'base64');
                await msg.channel.send({ content: `🎬 *[${meme.tipo.toUpperCase()}]* ${meme.titulo}`, files: [{ attachment: bufferFig, name: `${gatilho}.jpg` }] });
            }
        }
    }
});

waClient.initialize();
dcClient.login('MTU0OTQxODY2OTI4MzQ3NTYwNg.GTNTL9.-bJYKB7gTJnZ3O8vNUWXVlP6EQeCc2QpXytMKg');
