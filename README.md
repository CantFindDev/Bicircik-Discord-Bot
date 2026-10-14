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

Sohbet botuna verilen talimatlar `prompts/chatbot` klasöründeki metin dosyalarındadır: `character.txt` kişilik, `rules.txt` kurallar, diğerleri bilgi bölümleri. Dosyayı düzenleyip botu yeniden başlatman yeterli. `{username}`, `{date}` ve `{events}` yer tutucuları her mesajda bot tarafından doldurulur. Kişilik Türkçe yazılmıştır; biri İngilizce yazarsa bot aynı kişilikle İngilizce cevap verir (`rules.txt` 6. madde).

## Çalıştırma

| Sistem | Dosya |
|---|---|
| Windows | `run_WINDOWS.bat` |
| macOS | `run_MAC.command` |
| Linux | `./run_Linux.sh` |

Bağımlılıklar ilk çalıştırmada kendiliğinden kurulur. `.env` yoksa örnekten oluşturulur ve doldurman için durur.

`.env` ve `google-credentials.json` git'e girmez; her bilgisayara elle kopyalanır.

## Moderasyon

| Komut | İşi | Gereken yetki |
|---|---|---|
| `/uyar`, `/uyarı-sil`, `/sicil` | Uyarı verir, siler, kullanıcının geçmişini gösterir | Üyeleri Zaman Aşımına Uğrat |
| `/sustur`, `/susturma-kaldır` | Zaman aşımı verir ve kaldırır | Üyeleri Zaman Aşımına Uğrat |
| `/kick`, `/ban`, `/ban-kaldır` | Atar, yasaklar, yasağı kaldırır | Üyeleri At / Üyeleri Yasakla |
| `/kilit`, `/yavaş-mod` | Kanalı yazmaya kapatır, yavaş mod ayarlar | Kanalları Yönet |
| `/kullanıcı-bilgi` | Hesap yaşı, katılma tarihi, roller, uyarı sayısı | Üyeleri Zaman Aşımına Uğrat |
| `/otomod` | Davet, spam, toplu etiket ve yasaklı kelime filtreleri | Yönetici |

Her işlem kullanıcının siciline yazılır ve log kanalına düşer. Yetkiler hem Discord'da hem botun içinde kontrol edilir; Sunucu Ayarları > Entegrasyonlar üzerinden bir komutu yetkisiz bir role açmak işe yaramaz. Bir yetkili 10 dakikada en fazla 5 kişiyi atabilir veya yasaklayabilir, sunucu sahibi bu sınırın dışındadır. Mesajları Yönet yetkisi olanlar otomod filtrelerine takılmaz.

## Ekonomi ve oyunlar

| Komut | İşi |
|---|---|
| `/günlük`, `/çalış` | Günde bir ve saatte bir para kazandırır |
| `/bakiye`, `/zenginler`, `/gönder` | Cüzdan, sıralama, para transferi |
| `/avlan`, `/hayvanat-bahçesi`, `/sat` | Hayvan yakalama, koleksiyon, satış. `/sat` seçeneksiz yazılınca tek tek satış listesi açar, nadirlik verilince o nadirliğin tamamını satar |
| `/yazı-tura`, `/slot`, `/blackjack` | Bahisli oyunlar |
| `/düello`, `/yazı-tura-düello` | İki üye arasında bahisli hayvan düellosu ve yarı yarıya şanslı para düellosu |
| `/mağaza` | Her gün değişen egzotik hayvan mağazası |
| `/para-ayarla` | Yöneticinin bir cüzdana para ekleyip çıkarması |

Ödüller, bekleme süreleri ve bahis sınırları ilgili komut dosyasının başındaki sabitlerdir; bahis sınırı `src/utils/economy.js`, hayvan tablosu `src/utils/animals.js` içindedir.

Mağaza her gece Türkiye saatiyle 00:00'da yenilenir ve sunucu başına beş hayvan gösterir. Tür, kademe, huy, üç özellik (güç, hız, şans) ve fiyat rastgeledir; o günün listesi bot token'ı ile tohumlanır, yani yeniden başlatmada değişmez ama önceden tahmin edilemez. Stok sunucudaki herkes için ortaktır ve bir üye her hayvandan bir tane alabilir. Alınan hayvanlar satılamaz ve `/hayvanat-bahçesi` içinde görünür; liste en nadirden başlar, her hayvanın düello özelliklerini gösterir ve 10 hayvanda bir sayfalanır. Türler, kademeler ve fiyat aralığı `src/utils/dailyShop.js` içindedir.

`/düello` hayvan düellosudur: rakip kabul edince iki taraf da gizlice bir hayvan seçer (avlanan türler ve mağaza hayvanları), hayvanlar tur tur dövüşür ve kazanan iki bahsi alır. Güç hasarı, şans kritik vuruş ihtimalini, hız ilk vuruşu ve sıyrılma ihtimalini belirler. Avlanan hayvanların özellikleri `src/utils/animals.js`, dövüş katsayıları `src/utils/animalBattle.js` başındadır.

## Seviye

Mesaj başına 5 ile 15 XP, 30 saniyede bir. Bir seviyeyi bitirmek `5 × seviye² + 50 × seviye + 100` XP ister, seviye sınırı yoktur. Para ödülü 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90 ve 100. seviyelerde verilir: bir önceki ödüllü seviyeden beri harcanan XP'nin %25 ile %35'i arası rastgele bir tutar. 100'den sonra her 5 seviyede 5.000 ile 10.000 arası küçük bir ödül verilir. Seviyeler ve oranlar `src/utils/levelRewards.js` başındaki sabitlerdir.

Her cüzdan, ödülü ödenmiş en yüksek seviyeyi `rewardedLevel` alanında tutar; bir seviyenin ödülü iki kez ödenemez. Ödüller gelmeden önce kazanılmış seviyeler, bot açıldığında `src/events/ready/grantLevelBonus.js` tarafından ödenir. Bu işlem sunucu başınadır ve sadece botun bulunduğu sunucularda çalışır; biten sunucu `migrations` koleksiyonuna `economy-level-bonus:<sunucu ID>` adıyla işlenir.

## Alias ve dil

Adında Türkçe harf olan her komutun ASCII kopyası kendiliğinden oluşur (`/çalış` için `/calis`). İngilizce ad, komut dosyasındaki `aliases: [{ name, description, language }]` satırıyla verilir (`/work`).

Cevap dili yazılan komut adına göre seçilir: `language: 'en'` taşıyan alias İngilizce, Türkçe ad ve ASCII kopyası Türkçe cevap verir. Adı iki dilde aynı olan komutlar (`/slot`, `/blackjack`, `/ban`, `/kick`) `language: 'auto'` taşır ve kullanıcının Discord dili Türkçe ise Türkçe, değilse İngilizce cevap verir. İngilizce alias'ların seçenek adları, açıklamaları ve seçimleri de İngilizcedir (`hedef-kullanıcı` yerine `user`); çevirileri `src/locales/commandOptions.js` içindedir ve orada karşılığı olmayan metin Türkçe kalır. `auto` komutlarda seçenekler İngilizce kaydedilir, Türkçe Discord kullananlara Türkçesi gösterilir. Komut dosyaları seçenekleri her zaman Türkçe adıyla okur.

Metinler `src/locales/tr.js` ve `src/locales/en.js` içindedir; yeni dil için aynı anahtarlarla bir dosya ekleyip `src/utils/language.js` içindeki tabloya yazmak yeterlidir.

## Geliştirici modu

`.env` içindeki `DEVELOPER` listesindeki kullanıcıların sunucudaki herhangi bir kanala yazdığı mesajlarla çalışır. Listede olmayanların mesajları cevapsız kalır. Rol ve kullanıcı ID'si yerine etiket (`<@&rol>`, `<@kullanıcı>`) da yazılabilir.

| Mesaj | İşi |
|---|---|
| `ENABLE_DEVMODE=<rolID>` | Rolü sana verir, `DEVMODE=ACTIVE` yazar |
| `DISABLE_DEVMODE=<rolID>` | Rolü senden alır, `DEVMODE=INACTIVE` yazar |
| `DEVMODE` | Son açtığın rol hâlâ sende mi, onu yazar |
| `DEVMODE_ADD_ROLE=<rolID>,<kullanıcıID>` | Rolü o kullanıcıya verir |
| `DEVMODE_REMOVE_ROLE=<rolID>,<kullanıcıID>` | Rolü o kullanıcıdan alır |
| `ROLES_LIST_DEVMODE` | Botun verebildiği rolleri ve ID'lerini DM ile gönderir |

Bot yalnızca kendi rolünün altındaki rolleri verip alabilir ve Rolleri Yönet yetkisi olmalıdır. Her işlem log kanalına düşer.
