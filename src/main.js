import { Telegraf, session } from 'telegraf'
import { code } from 'telegraf/format'
import { message } from 'telegraf/filters'
import config from 'config'
import { ogg } from "./ogg.js"
import { openai } from "./openai.js"
import { removeFile } from './utils.js'

console.log(config.get('TEST_ENV'))

const INITIAL_SESSION = {
    messages: [],
}

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))
//
bot.use(session())

bot.command('new', async (ctx) => {
ctx.session = INITIAL_SESSION
await ctx.reply ('Waiting for your voice or text message')
})

bot.command('start', async (ctx) => {
    ctx.session = INITIAL_SESSION
    await ctx.reply ('Waiting for your voice or text message')
    })

    //if voice message from user
bot.on(message('voice'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION
try {

    await ctx.reply(code('Converting voice message to text. Please wait.'))
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const userId = String(ctx.message.from.id)
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const text = await openai.transcription(mp3Path)
    await ctx.reply(code(`Your request: ${text}`))
    await ctx.reply(code('Please wait for the response from ChatGPT.'))


    ctx.session.messages.push({ role: openai.roles.USER, content: text})
    const response = await openai.chat(ctx.session.messages) //message to chat
    ctx.session.messages.push({ role: openai.roles.ASSISTANT, content: response.content})


    await ctx.reply(response.content)
  removeFile(mp3Path)
} catch (e) {
    console.log('Error while voice message', e.message);
}
})

//if text message from user
bot.on(message('text'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION
    try {
        await ctx.reply(code('Please wait for the response from ChatGPT.'))
   
        ctx.session.messages.push({ 
            role: openai.roles.USER, 
            content: ctx.message.text,
        })
//message to chat
        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({ 
            role: openai.roles.ASSISTANT, 
            content: response.content,
        })
        
        await ctx.reply(response.content)
    } catch (e) {
        console.log('Error while text message', e.message);
    }
    })




//DOnation part


//DOnation end



bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))