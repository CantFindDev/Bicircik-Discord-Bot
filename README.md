# Bıcırcık

BUG Zone Discord botu.

## Kurulum

### 1. Node.js

[nodejs.org](https://nodejs.org) üzerinden kur.

### 2. `.env`

`.env-Example` dosyasını `.env` olarak kopyala ve değerleri doldur.

| Anahtar | Nereden alınır |
|---|---|
| `BOT_TOKEN` | [Discord Developer Portal](https://discord.com/developers/applications) > uygulaman > Bot > Reset Token |
| `CHATBOT_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) > Create API key |
| `DB_CONNECTION_URI` | [MongoDB Atlas](https://cloud.mongodb.com) > cluster > Connect > Drivers |
| `DEVELOPER` | `devOnly` komutları ve developer modunu kullanabilen Discord kullanıcı ID'si. Birden fazlaysa virgülle ayır. |

Developer Portal'da Bot sayfasındaki üç Privileged Gateway Intent de açık olmalı: Presence, Server Members, Message Content.

### 3. `google-credentials.json`

Bot, etkinlikleri Google Takvim'den okur. Dosyayı Google hazır olarak verir, içine elle bir şey yazılmaz.

1. [Google Cloud Console](https://console.cloud.google.com) üzerinde bir proje aç ve Google Calendar API'yi etkinleştir.
2. IAM & Admin > Service Accounts > Create service account.
3. Oluşan hesabın Keys sekmesinde Add key > Create new key > JSON seç. Dosya bilgisayarına iner.
4. İnen dosyanın adını `google-credentials.json` yap ve proje köküne koy.
5. Google Takvim'de takvimin ayarlarından servis hesabının e-postasını (`...iam.gserviceaccount.com`) paylaşım olarak ekle.

Okunan takvimin ID'si `src/events/messageCreate/handleChatBot.js` içindeki `CALENDAR_ID` değeridir.

### 4. `config.json`

| Anahtar | Anlamı |
|---|---|
| `testGuild` | `testOnly` komutların kaydedildiği sunucunun ID'si |
| `mainGuild` | `mainOnly` komutların kaydedildiği sunucunun ID'si |
| `botID` | Botun uygulama ID'si |
| `disabledCommands` | Kapatılan komutların adları, örn. `["ekip", "ekipsistemi"]` |
| `chatBot.liteModels` | Kısa, gündelik mesajlara cevap veren hızlı modeller |
| `chatBot.flashModels` | Uzun mesajlara ve sorulara cevap veren modeller |
| `chatBot.researchAgent` | Mesajda "araştır" geçtiğinde internette arama yapan ajan |

Sohbet botu her mesaj için uygun listeden başlar; bir model kota sınırına takılırsa sıradakine geçer ve dolan modeli bir süre denemez. Hiçbiri cevap veremezse `prompts/chatbot/unavailable.txt` içinden rastgele bir mesaj yazar.

Bir komutu kapatmak için adını `disabledCommands` listesine ekle, açmak için listeden sil, sonra botu yeniden başlat. Kapalı komut Discord'daki listeden kalkar. `ekip` kapalıyken ekip kurma butonu da çalışmaz.

### 5. Sohbet botunun kişiliği

Sohbet botuna verilen talimatlar `prompts/chatbot` klasöründeki metin dosyalarındadır: `character.txt` kişilik, `rules.txt` kurallar, diğerleri bilgi bölümleri. Dosyayı düzenleyip botu yeniden başlatman yeterli. `{username}`, `{date}` ve `{events}` yer tutucuları her mesajda bot tarafından doldurulur.

## Çalıştırma

| Sistem | Dosya |
|---|---|
| Windows | `run_WINDOWS.bat` |
| macOS | `run_MAC.command` |
| Linux | `./run_Linux.sh` |

Bağımlılıklar ilk çalıştırmada kendiliğinden kurulur. `.env` yoksa örnekten oluşturulur ve doldurman için durur.

`.env` ve `google-credentials.json` git'e girmez; her bilgisayara elle kopyalanır.
