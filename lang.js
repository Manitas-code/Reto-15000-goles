/* ===== GOALDAY · idioma (ES / EN) ===== */
(function(){
var KEY='fg_lang';var T0=null;
var D={
// ---- portada de juegos ----
'GOALDAY — Juegos de fútbol':'GOALDAY — Daily football games',
'GOALDAY — Reto de los 15.000 goles':'GOALDAY — 15,000 Goals Challenge',
'Juegos de fútbol. Uno nuevo cada día.':'Football games. A new one every day.',
'Juegos':'Games','← Juegos':'← Games','Diario · Duelos':'Daily · Duels','Nuevo':'New',
'Reto de los 15.000 goles':'15,000 Goals Challenge',
'17 futbolistas, 17 casillas con multiplicadores. ¿Llegas a 15.000?':'17 players, 17 slots with multipliers. Can you reach 15,000?',
'Sale un jugador con sus goles. ¿El siguiente tiene más o menos? Aguanta la racha.':'A player appears with his goals. Does the next one have more or fewer? Keep the streak alive.',
'Blackjack de goles':'Goals Blackjack',
'Suma goles de jugadores y plántate antes de pasarte del objetivo.':'Add up players\' goals and stand before you go over the target.',
'Idioma / Language':'Language / Idioma',
// ---- Blackjack v3 (mesa y cartas) ----
'Empiezas con 1.000 fichas y juegas 10 manos. En cada mano apuestas 100, 200 o 300 fichas y te reparten dos jugadores; la banca también recibe dos, uno boca abajo.':'You start with 1,000 chips and play 10 hands. Each hand you bet 100, 200 or 300 chips and get two players; the house also gets two, one face down.',
'No se ha podido guardar: falta crear la tabla del ranking en Supabase.':'Couldn\'t save: the ranking table hasn\'t been created yet.',
'No se ha podido guardar: la tabla del ranking no tiene permisos.':'Couldn\'t save: the ranking table has no permissions.',
'¿Lo coges?':'Take him?','suma sus goles':'adds his goals','juega la banca':'the house plays','lo cojo y me planto':'take and stand','Medio':'Midfielder',
// ---- Blackjack v4 (10 manos, apuesta fija, reloj y reto diario) ----
'Tienes 10 segundos para decidir: si se acaba el tiempo, te plantas. Clavar el objetivo paga el doble. Si te quedan menos de 100 fichas, la partida termina antes.':'You have 10 seconds to decide: if time runs out, you stand. Hitting the target exactly pays double. If you have fewer than 100 chips left, the game ends early.',
'Tu puntuación son las fichas con las que acabas. El reto diario tiene las mismas 10 manos para todo el mundo y un solo intento.':'Your score is the chips you finish with. The daily challenge has the same 10 hands for everyone and one attempt.',
'Goles en toda su carrera. Las mismas 10 manos para todo el mundo. Un solo intento al día.':'Career goals. The same 10 hands for everyone. One attempt per day.',
'para decidir':'to decide','de 10':'of 10','Te plantas: se acabó el tiempo':'You stand: time\'s up','¡nuevo récord!':'new record!',
// ---- Blackjack v2 (ranking) ----
'🌍 Ranking mundial':'🌍 World ranking','Cargando…':'Loading…','Todavía no hay nadie. ¡Sé el primero!':'Nobody here yet. Be the first!',
'Ranking no disponible ahora mismo.':'Ranking not available right now.',
'Guardando en el ranking mundial…':'Saving to the world ranking…',
'Elige tu nombre para salir en el ranking mundial:':'Choose your name to appear in the world ranking:',
'Mínimo 2 caracteres.':'At least 2 characters.',
'No se ha podido guardar. Revisa la conexión.':'Couldn\'t save. Check your connection.',
// ---- Blackjack ----
'Juega contra la banca con fichas. Ves el nombre del jugador, pero no sus goles: cógelo o plántate sin pasarte del objetivo.':'Play against the house with chips. You see the player\'s name, not his goals: take him or stand without going over the target.',
'Sale el siguiente jugador: lo coges (suma sus goles), te plantas o doblas la apuesta cogiéndolo y plantándote.':'The next player comes up: take him (his goals are added), stand, or double your bet by taking him and standing.',
'Si te pasas del objetivo, pierdes. Si no, la banca pide hasta llegar a su mínimo y gana quien más se acerque. El empate es para la banca.':'Go over the target and you lose. Otherwise the house draws until it reaches its minimum, and whoever gets closer wins. Ties go to the house.',
'Récord de fichas':'Chip record','Manos':'Hands','Mano':'Hand','Banca':'House',
'Repartir':'Deal','Repartiendo…':'Dealing…',
'✔ Lo cojo':'✔ Take','✋ Me planto':'✋ Stand','×2 Doblo':'×2 Double','Juega la banca…':'The house plays…',
'¡Clavado!':'Spot on!','¡Ganas la mano!':'You win the hand!','¡La banca se pasa!':'The house busts!','Te has pasado':'Bust!',
'Empate: gana la banca':'Tie: the house wins','Gana la banca':'The house wins','Siguiente mano':'Next hand','Ver resultado':'See result',
// ---- Más o Menos ----
'Sale un jugador con sus goles. ¿El siguiente tiene más o menos?':'A player appears with his goals. Does the next one have more or fewer?',
'▶ Carrera':'▶ Career','▶ Selección':'▶ National team',
'Goles totales en toda su carrera.':'Total career goals.','Goles con su selección nacional.':'Goals for his national team.',
'Mejor racha':'Best streak','Aciertos':'Correct answers',
'Goles · Carrera':'Goals · Career','Goles · Selección':'Goals · National team',
'Racha':'Streak','Récord':'Record','goles':'goals','▲ Más':'▲ Higher','▼ Menos':'▼ Lower',
'Goles en toda su carrera':'Career goals','Goles con su selección':'National team goals',
'acierto seguido · ¡nuevo récord!':'correct in a row · new record!','aciertos seguidos · ¡nuevo récord!':'correct in a row · new record!',
'Otra vez':'Play again','Copiado ✔':'Copied ✔',
'10 segundos':'10 seconds','para cada respuesta':'to answer each one',
'Los mismos jugadores para todo el mundo. Un solo intento al día.':'The same players for everyone. One attempt per day.',
'Hoy lo dejaste a medias':'Left unfinished today','vuelve mañana':'come back tomorrow',
'Se acabó el tiempo':'Time\'s up','acierto seguido':'correct in a row','aciertos seguidos':'correct in a row','mañana hay otro reto':'new challenge tomorrow',
'Volver':'Back','Elige tu nombre para salir en el ranking':'Choose your name to appear in the ranking',
// ---- Emoji Player ----
'Emoji Player · GOALDAY':'Emoji Player · GOALDAY',
'5 futbolistas escondidos en emojis. 3 intentos para cada uno. ¿Los pillas todos?':'5 footballers hidden in emojis. 3 guesses each. Can you get them all?',
'Diario':'Daily',
'Cinco futbolistas al día escondidos en emojis. Adivínalos en tres intentos.':'Five footballers a day hidden in emojis. Guess them in three tries.',
'5 futbolistas escondidos en emojis.':'5 footballers hidden in emojis.','3 intentos':'3 guesses','para cada uno.':'for each one.',
'Hoy:':'Today:',
'Acierta a la primera: 600 puntos · a la segunda: 400 · a la tercera: 200. Los mismos 5 jugadores para todo el mundo. Un solo intento al día.':'First try: 600 points · second: 400 · third: 200. Same 5 players for everyone. One go per day.',
'▶ Jugar el reto de hoy':'▶ Play today\'s challenge','▶ Continuar el reto de hoy':'▶ Continue today\'s challenge','Ver mi resultado de hoy':'See my result for today',
'Jugador':'Player','de 5':'of 5','Vale':'Worth','puntos':'points',
'Escribe el nombre del jugador':'Type the player\'s name','Probar':'Guess',
'Elige un jugador de la lista.':'Pick a player from the list.',
'No es él. Te quedan 2 intentos.':'Not him. 2 guesses left.','Tampoco. Último intento.':'Nope. Last guess.',
'¡Acertaste!':'Correct!','Se acabaron los intentos.':'Out of guesses.',
'Siguiente jugador →':'Next player →',
'Reto de hoy completado':'Today\'s challenge complete','puntos de 3.000':'points out of 3,000','aciertos de 5':'correct out of 5','días seguidos':'day streak',
'📤 Compartir resultado':'📤 Share result','Ver los jugadores':'See the players','Mañana hay 5 jugadores nuevos.':'5 new players tomorrow.','no acertado':'missed',
'🌍 Ranking semanal':'🌍 Weekly ranking','Esta semana':'This week','Hoy':'Today',
'La semana se cierra el domingo a medianoche y el lunes empieza de cero. Los 3 primeros de cada semana ganan medalla.':'The week closes Sunday at midnight and resets on Monday. The top 3 each week win a medal.',
'Elige tu nombre para el ranking mundial:':'Choose your name for the world ranking:','Vale para todos los juegos de GOALDAY. Máximo 16 caracteres.':'It works for every GOALDAY game. 16 characters max.','Guardar y jugar':'Save and play','Ahora no':'Not now','Comprobando…':'Checking…','Nombre registrado:':'Name registered:',
// ---- portada ----
'GOALDAY · 17 jugadores · 17 casillas · un objetivo':'GOALDAY · 17 players · 17 slots · one goal',
'Reto de los':'The','15.000 goles':'15,000 Goals Challenge',
'Van saliendo futbolistas al azar, uno a uno, y tú decides en qué casilla colocar a cada uno, de memoria. Al acabar, el recuento revela cuánto ha sumado cada uno. Cada casilla solo se usa una vez.':'Players come out at random, one by one, and you decide which slot to put each one in, from memory. At the end, the count reveals how much each one scored. Each slot can only be used once.',
'Cómo se juega':'How to play',
'Sale una carta con un jugador. Toca la casilla donde quieras ponerlo. No verás los puntos hasta el final: el recuento se hace de golpe, casilla por casilla.':'A player card appears. Tap the slot where you want to place him. You won\'t see the points until the end: the count is done all at once, slot by slot.',
'Suma sus goles en esa categoría por el multiplicador: Champions ×10, Selección ×10, Mundiales ×100, final del Mundial ×1000…':'You score his goals in that category times the multiplier: Champions ×10, National team ×10, World Cups ×100, World Cup final ×1000…',
'En cada partida una de las seis ligas vale ×5 en vez de ×1.':'In every game one of the six leagues is worth ×5 instead of ×1.',
'Tras 17 jugadores, si pasas del objetivo has superado el reto. Al final verás cuántos puntos daba la mejor colocación posible.':'After 17 players, if you beat the target you\'ve completed the challenge. At the end you\'ll see how many points the best possible placement would have given.',
'Reto diario':'Daily challenge','Los mismos 17 jugadores para todo el mundo':'The same 17 players for everyone','Los mismos 17 jugadores para todo el mundo. Un solo intento':'The same 17 players for everyone. One attempt only',
'Partida libre':'Free play','Juega las veces que quieras':'Play as many times as you like',
'⚔️ Duelo online':'⚔️ Online duel','Contra un rival en directo, mismos 17 jugadores. Asciende de la liga de San Marino al Mundial':'Against a live opponent, same 17 players. Climb from the San Marino league to the World Cup',
'🔗 Reta a un amigo':'🔗 Challenge a friend','Le mandas un enlace y jugáis a la vez los mismos 17, en directo':'Send them a link and play the same 17 at the same time, live',
'🏟️ Equipo':'🏟️ Team','Sonido':'Sound','Elige tu equipo':'Choose your team','Inicio':'Home',
'Partidas':'Games','Retos superados':'Challenges beaten','Mejor total':'Best total',
'🌍 Hoy':'🌍 Today','🌍 Mejores de siempre':'🌍 All-time best','Rangos y logros':'Ranks & achievements','⚔️ Duelos':'⚔️ Duels','Cambiar nombre':'Change name',
'Basado en el reto viral de los 15.000 goles. Cifras de goles aproximadas.':'Based on the viral 15,000 goals challenge. Goal figures are approximate.',
'Tus resultados se guardan en este dispositivo.':'Your results are saved on this device.',
'Ranking mundial':'World ranking','Elige tu nombre para salir en el ranking (2 a 16 caracteres). Es único: nadie más podrá usarlo.':'Choose your name for the ranking (2 to 16 characters). It\'s unique: nobody else can use it.',
'Guardar':'Save','Tu nombre':'Your name','Mantén pulsada la imagen para guardarla, o usa el botón.':'Press and hold the image to save it, or use the button.','Compartir':'Share','Cerrar':'Close','Cancelar':'Cancel','Continuar':'Continue',
// ---- equipo ----
'¿De qué equipo eres?':'Which team do you support?','Elige primero tu liga. Tu estadio será el fondo del juego y podrás cambiarlo cuando quieras.':'Pick your league first. Your stadium will be the game background and you can change it any time.',
'Elige tu liga. Tu estadio será el fondo de todos los juegos y puedes cambiarlo cuando quieras.':'Pick your league. Your stadium will be the background of every game and you can change it any time.',
'Espera a que termine el recuento':'Wait for the count to finish',
'Ya lo has probado. Elige otro jugador.':'You already tried him. Pick another player.',
'Sin equipo, gracias':'No team, thanks','‹ Ligas':'‹ Leagues','Liga Argentina':'Argentine league','Liga MX':'Liga MX','20 equipos':'20 teams','18 equipos':'18 teams','30 equipos':'30 teams',
// ---- partida ----
'Sacando al primer jugador…':'Drawing the first player…','Total':'Total','Descartar jugador':'Discard player','Descartes:':'Discards:','Puntos totales':'Total points','Jugar otra vez':'Play again','🔁 Jugar otra vez':'🔁 Play again','⚔️ Jugar otra vez':'⚔️ Play again','Compartir imagen':'Share image','Ver mi rango':'See my rank','Ver mis medallas':'See my medals',
'Vamos a ver cuánto has sumado…':'Let\'s see how much you scored…','Colocación perfecta: no se podía sacar más con estos 17.':'Perfect placement: you couldn\'t get more with these 17.',
'Se acabó el tiempo: jugador colocado al azar':'Time\'s up: player placed at random','Partida terminada':'Game over','Objetivo superado':'Target beaten','Puntuación subida':'Score uploaded','Reto diario completado':'Daily challenge completed',
'Selección':'National team','América':'Americas','Carrera':'Career','Goles de cabeza':'Headers','Goles olímpicos':'Olympic goals','Mundiales':'World Cups','Final de Champions':'Champions final','Final de Libertadores':'Libertadores final','Final del Mundial':'World Cup final','Eredivisie / Primeira':'Eredivisie / Primeira','Eredivisie / Primeira Liga':'Eredivisie / Primeira Liga',
'Defensa':'Defender','Centrocampista':'Midfielder','Delantero':'Forward',
'Hoy lo dejaste a medias. Vuelve mañana':'You left today\'s challenge unfinished. Come back tomorrow','Cambia a partida libre para seguir jugando.':'Switch to free play to keep playing.',
'Empezaste el reto diario de hoy y lo dejaste a medias: cuenta como jugado. Vuelve mañana.':'You started today\'s daily challenge and left it unfinished: it counts as played. Come back tomorrow.',
'Solo tienes un intento:':'You only have one attempt:','No cierres esta página.':'Don\'t close this page.','si sales a medias, cuenta como jugado.':'if you leave halfway, it counts as played.',
'Todavía no hay puntuaciones. ¡Estrena el ranking!':'No scores yet. Be the first on the ranking!','Nadie ha jugado aún el reto de hoy. ¡Sé el primero!':'Nobody has played today\'s challenge yet. Be the first!',
'Cargando ranking mundial…':'Loading world ranking…','No se ha podido cargar el ranking mundial. Revisa la conexión.':'Couldn\'t load the world ranking. Check your connection.','Aún no tienes nombre en el ranking':'You don\'t have a ranking name yet','Elegir nombre':'Choose name',
'Ese nombre ya lo tiene otro jugador. Elige otro.':'That name is already taken. Choose another one.','No se pudo subir la puntuación. Revisa la conexión.':'Couldn\'t upload the score. Check your connection.','Sin conexión':'No connection','Revisa la conexión y vuelve a intentarlo.':'Check your connection and try again.',
'Tus medallas':'Your medals','Logro desbloqueado':'Achievement unlocked','Logro oculto':'Hidden achievement','Descúbrelo jugando':'Find out by playing','Rango máximo alcanzado':'Maximum rank reached','Has llegado al rango máximo':'You\'ve reached the maximum rank','TU RANGO':'YOUR RANK','TU RANGO ACTUAL':'YOUR CURRENT RANK','HAS SUBIDO DE RANGO':'RANK UP','¡HAS SUBIDO DE RANGO!':'RANK UP!','Todo desbloqueado · eres el 0,0001%':'Everything unlocked · you\'re the 0.0001%',
// rangos
'Banquillo':'Bench','Cantera':'Academy','Suplente':'Substitute','Bronce':'Bronze','Titular':'Starter','Plata':'Silver','Pichichi':'Top scorer','Oro':'Gold','Bota de Oro':'Golden Boot','Leyenda':'Legend','Balón de Oro':'Ballon d\'Or','Común':'Common','Poco común':'Uncommon','Rara':'Rare','Épica':'Epic','Legendaria':'Legendary','Mítica':'Mythic',
'Marco de carta plateado':'Silver card frame','Marco de carta dorado':'Gold card frame','Carta de bronce desbloqueada':'Bronze card unlocked','Césped nocturno desbloqueado':'Night pitch unlocked','Fondo de estadio con focos':'Stadium background with floodlights','Balón dorado en la portada':'Golden ball on the home screen','Confeti dorado al terminar la partida':'Golden confetti at the end of the game','Insignia 🥉 junto a tu nombre en el ranking':'🥉 badge next to your name in the ranking','Insignia 🏅 y color épico en tu nombre':'🏅 badge and epic colour on your name','Marco mítico y efecto de brillo':'Mythic frame and glow effect','Carta legendaria y corona 👑 en el ranking':'Legendary card and 👑 crown in the ranking',
// logros
'Debut':'Debut','Juega tu primera partida':'Play your first game','Cinco partidas':'Five games','Juega 5 partidas':'Play 5 games','Veinticinco partidas':'Twenty-five games','Juega 25 partidas':'Play 25 games','Centenario':'Centurion','Juega 100 partidas':'Play 100 games','Pasa de 5.000 puntos':'Score over 5,000 points','Pasa de 7.000 puntos':'Score over 7,000 points','Pasa de 10.500 puntos':'Score over 10,500 points','Doce mil':'Twelve thousand','Pasa de 12.000 puntos':'Score over 12,000 points','¡Reto superado!':'Challenge beaten!','Llega a 15.000 puntos':'Reach 15,000 points','Llega a 20.000 puntos':'Reach 20,000 points','Cien mil':'One hundred thousand','Suma 100.000 puntos en total':'Score 100,000 points in total','Jugadón':'Big play','Haz 2.000 puntos en una sola casilla':'Score 2,000 points in a single slot','Bombazo':'Blockbuster','Haz 4.000 puntos en una sola casilla':'Score 4,000 points in a single slot','Puntúa en la casilla de la final del Mundial':'Score in the World Cup final slot','Noche de Libertadores':'Libertadores night','Puntúa en la final de Libertadores':'Score in the Libertadores final','Noche mágica':'Magic night','Puntúa en la final de Champions':'Score in the Champions final','Gol olímpico':'Olympic goal','Puntúa en la casilla de goles olímpicos':'Score in the Olympic goals slot','Triplete de finales':'Treble of finals','Puntúa en las tres finales a la vez':'Score in all three finals at once','De cabeza':'Header','Haz 500+ puntos con goles de cabeza':'Score 500+ points with headers','Aprovechar el ×5':'Make the ×5 count','Haz 500+ puntos en la liga con ×5':'Score 500+ points in the ×5 league','Colocación perfecta':'Perfect placement','Saca el máximo posible con tus jugadores':'Get the maximum possible with your players','Sin red':'No safety net','Termina sin usar ningún descarte':'Finish without using any discard','Criba':'Cull','Usa los dos descartes en una partida':'Use both discards in one game','A quemar':'Burned','Coloca a un jugador que suma 0':'Place a player who scores 0','Partida maldita':'Cursed game','Tres casillas a 0 en la misma partida':'Three slots at 0 in the same game','Primer diario':'First daily','Juega un reto diario':'Play a daily challenge','Una semana':'One week','Juega 7 retos diarios':'Play 7 daily challenges','Un mes entero':'A whole month','Juega 30 retos diarios':'Play 30 daily challenges','En racha':'On a roll','3 partidas seguidas de 8.000+':'3 games in a row of 8,000+','Imparable':'Unstoppable','5 partidas seguidas de 8.000+':'5 games in a row of 8,000+','Vitrina':'Trophy cabinet','Consigue 6 medallas distintas':'Get 6 different medals','El Clásico':'El Clásico','Coloca a Messi y a Cristiano en la misma partida':'Place Messi and Cristiano in the same game','Capicúa':'Palindrome','Termina con una puntuación capicúa de 4 cifras o más':'Finish with a palindromic score of 4 digits or more','Plantilla de bajas':'Injury list','Descarta a dos jugadores y aun así pasa de 9.000':'Discard two players and still beat 9,000','Paseo militar':'Walk in the park','Que ninguna de las 17 casillas se quede a 0':'No slot left at 0 out of the 17','Remontada':'Comeback','Supera tu récord por más de 2.000 puntos de golpe':'Beat your record by more than 2,000 points in one go',
// duelos
'Buscar rival':'Find opponent','Buscando rival':'Finding opponent','¡Rival encontrado!':'Opponent found!','Tu rival':'Your opponent','Tú':'You','Invitar a alguien':'Invite someone','Crear mi sala':'Create my room','Enviar enlace':'Send link','Enviar el reto':'Send the challenge','Crear otro reto':'Create another challenge','Crear mi propio reto':'Create my own challenge','Aceptar el reto':'Accept the challenge','Volver a mandarlo':'Send it again','Copia este enlace:':'Copy this link:','Enlace copiado.':'Link copied.','Pégalo en WhatsApp o donde quieras.':'Paste it on WhatsApp or wherever you like.','¡Jugar!':'Play!','¡Revancha!':'Rematch!','Revancha pedida':'Rematch requested','¡A por ello!':'Go for it!',
'Creando la sala…':'Creating the room…','Creando tu reto…':'Creating your challenge…','Entrando en la sala…':'Entering the room…','Cargando duelos…':'Loading duels…','Empezáis en cuanto los dos tengáis la web abierta…':'You both start as soon as you both have the page open…','Ya ha terminado, calculando…':'Finished, calculating…',
'Código de la sala · caduca en 15 minutos':'Room code · expires in 15 minutes','Mándale el enlace. Cuando entre, empezáis los dos a la vez con los mismos 17 jugadores.':'Send them the link. When they join, you both start at the same time with the same 17 players.','Esa sala es tuya: mándale el enlace a tu amigo.':'That room is yours: send the link to your friend.','La sala se ha cancelado.':'The room has been cancelled.','Sala no disponible':'Room unavailable','Duelo anulado':'Duel cancelled','Reto ya empezado':'Challenge already started','Ese enlace no es válido.':'That link isn\'t valid.','Ese reto no existe o el enlace está mal copiado.':'That challenge doesn\'t exist or the link was copied wrong.',
'Te emparejamos con el primero que busque duelo. Los dos jugáis los mismos 17 jugadores a la vez, con 20 segundos por jugador. Gana quien más sume.':'We pair you with the first person looking for a duel. You both play the same 17 players at the same time, with 20 seconds per player. Highest score wins.',
'Duelo en directo: jugáis los dos a la vez con los mismos 17 jugadores y 20 segundos por jugador. Gana quien más sume. Es amistoso: no cuenta para el ELO.':'Live duel: you both play at the same time with the same 17 players and 20 seconds per player. Highest score wins. It\'s friendly: it doesn\'t count for ELO.',
'Mándale el enlace a quien quieras: jugará tus mismos 17 jugadores sin ver tu puntuación hasta el final. Verás quién te gana en la pestaña ⚔️ Duelos.':'Send the link to anyone: they\'ll play your same 17 players without seeing your score until the end. You\'ll see who beats you in the ⚔️ Duels tab.',
'Ahora mismo no hay nadie más buscando. Mándale el enlace a alguien: cuando entre y busque, os emparejamos al momento.':'Nobody else is searching right now. Send the link to someone: when they join and search, we\'ll pair you instantly.',
'Te han invitado a un duelo. Dale a buscar rival y os emparejamos.':'You\'ve been invited to a duel. Tap find opponent and we\'ll pair you up.',
'Pierdes: no terminaste a tiempo':'You lose: you didn\'t finish in time','Has perdido el duelo':'You lost the duel','🏆 ¡Has ganado el duelo!':'🏆 You won the duel!','🏆 ¡Le has ganado!':'🏆 You beat them!','🤝 Empate':'🤝 Draw','Te ha ganado':'They beat you','Le ganaste':'You beat them','Ninguno de los dos terminó. No cuenta para el ELO.':'Neither of you finished. It doesn\'t count for ELO.','Duelo amistoso · no cuenta para el ELO':'Friendly duel · doesn\'t count for ELO','🤝 Duelo amistoso: no cuenta para el ELO':'🤝 Friendly duel: doesn\'t count for ELO','Comparar casilla por casilla':'Compare slot by slot','Todavía no lo ha jugado nadie.':'Nobody has played it yet.','Tus retos por enlace':'Your link challenges','Clasificación de duelos online':'Online duels ranking','Aún no se ha jugado ningún duelo. Estrena la clasificación.':'No duel has been played yet. Be the first on the ranking.','Juega un duelo online para entrar en la clasificación':'Play an online duel to enter the ranking','Campeón de la temporada pasada':'Last season\'s champion','¡Eres el campeón!':'You\'re the champion!','Estás entre los 50 mejores del mundo':'You\'re among the 50 best in the world','Top 50 por llenar: gana duelos para entrar':'Top 50 still open: win duels to get in','Para el Mundial: entrar en el top 50':'For the World Cup: enter the top 50','👑 ¡Eres el número 1 del mundo!':'👑 You\'re number 1 in the world!','⬇️ Sales del top 50':'⬇️ You drop out of the top 50','⬆️ ¡entras en el top 50!':'⬆️ you enter the top 50!','fuera del top 50':'outside the top 50','aún no estás en el top 50':'not in the top 50 yet','sin clasificar':'unranked','mismos 17 jugadores para los dos':'same 17 players for both','te tocan sus mismos 17 jugadores':'you get their same 17 players','mismos 17 jugadores para todo el mundo, una sola partida':'same 17 players for everyone, one game only','🔗 Tu reto · al terminar tendrás el enlace para mandarlo':'🔗 Your challenge · you\'ll get the link to send when you finish','. En los primeros duelos subes más rápido.':'. You climb faster in your first duels.',
'No se ha podido crear el reto':'Couldn\'t create the challenge','No se ha podido enviar tu resultado.':'Couldn\'t send your result.','No se ha podido enviar tu resultado. Comprueba la conexión: el duelo sigue abierto unos minutos.':'Couldn\'t send your result. Check your connection: the duel stays open for a few minutes.','No se ha podido entrar. Revisa la conexión.':'Couldn\'t join. Check your connection.','No se ha podido buscar rival. Revisa la conexión.':'Couldn\'t search for an opponent. Check your connection.','No se ha podido abrir el reto. Revisa la conexión.':'Couldn\'t open the challenge. Check your connection.','No se ha podido abrir la sala. Revisa la conexión.':'Couldn\'t open the room. Check your connection.','No se ha podido crear la sala. Revisa la conexión.':'Couldn\'t create the room. Check your connection.','No se ha podido empezar el reto. Revisa la conexión.':'Couldn\'t start the challenge. Check your connection.','No se ha podido pedir la revancha. Revisa la conexión.':'Couldn\'t request the rematch. Check your connection.','No se han podido cargar los duelos. Revisa la conexión.':'Couldn\'t load the duels. Check your connection.',
'Cada mes es una temporada: el día 1 se guarda tu clasificación como medalla y los puntos se reinician a mitad de camino de 1.000. Todos empiezan con 1.000 puntos en la Saudi Pro League. Ganar un duelo suma y perderlo resta; ganar a alguien de una liga mejor da más. En los 10 primeros duelos se sube más rápido, y desde la Premier cuesta más. Bonus: +5 si haces 12.000 en el reto y +10 si llegas a 15.000, ganes o pierdas. El Mundial es para los 50 mejores del mundo que estén a nivel Champions. Los retos por enlace son amistosos y no cuentan.':'Every month is a season: on the 1st your ranking is saved as a medal and points are reset halfway back to 1,000. Everyone starts with 1,000 points in the Saudi Pro League. Winning a duel adds points and losing one subtracts them; beating someone from a better league gives more. You climb faster in your first 10 duels, and it gets harder from the Premier League up. Bonus: +5 if you score 12,000 in the challenge and +10 if you reach 15,000, win or lose. The World Cup is for the 50 best players in the world at Champions level. Link challenges are friendly and don\'t count.',
'Nombre cambiado:':'Name changed:','Reintentar':'Retry','🔗 Reto listo':'🔗 Challenge ready','Comparando…':'Comparing…','¡Dentro!':'You\'re in!','Reta a un amigo':'Challenge a friend','Duelo online':'Online duel','¡Duelo con tu amigo!':'Duel with your friend!',
'Tu reto':'Your challenge','Te ganó':'They beat you','Empate':'Draw','empate':'draw','perdió':'lost','a medias':'unfinished','ti':'you','le has ganado':'you beat them','te ha ganado':'they beat you','Hiciste':'You scored','puntos.':'points.',
'Liga de San Marino':'San Marino league','Mundial':'World Cup','⚔️ Duelos:':'⚔️ Duels:','Estás en el':'You\'re in the','y juegas el Mundial':'and you play the World Cup','Te faltan':'You need','te faltan':'you need','puntos para el Mundial':'points for the World Cup','puntos para entrar en el top 50':'points to enter the top 50','🌍 Vas':'🌍 You\'re','del mundo en duelos':'in the world in duels',
'Empieza la':'Welcome to','. Los puntos se han reiniciado a mitad de camino: ahora tienes':'. Points have been reset halfway back to 1,000: you now have','. Los puntos se han reiniciado a mitad de camino. En los primeros duelos subes más rápido.':'. Points have been reset halfway back to 1,000. You climb faster in your first duels.',
'Enero':'January','Febrero':'February','Marzo':'March','Abril':'April','Mayo':'May','Junio':'June','Julio':'July','Agosto':'August','Septiembre':'September','Setiembre':'September','Octubre':'October','Noviembre':'November','Diciembre':'December',
'enero':'January','febrero':'February','marzo':'March','abril':'April','mayo':'May','junio':'June','julio':'July','agosto':'August','septiembre':'September','setiembre':'September','octubre':'October','noviembre':'November','diciembre':'December',
// partida
'Libre':'Empty','Empezar':'Start','Tienes':'You have','un solo intento':'one attempt','al día. Si sales a medias o cierras la página, cuenta como jugado y no podrás volver a entrar hasta mañana.':'per day. If you leave halfway or close the page, it counts as played and you can\'t come back until tomorrow.',
'Esta partida':'This game','vale ×5. ¿Dónde colocas a':'is worth ×5. Where do you place','¿Dónde colocas a':'Where do you place','Recuento':'Counting','Este ha sido tu resultado.':'Here\'s your result.',
'Capitán':'Captain','Internacional':'International','Crack':'Star player','Estrella':'Superstar','máximo':'max','rango máximo':'max rank','AQUÍ':'HERE','Logros':'Achievements','al ranking mundial':'to the world ranking','Resultado':'Result','sin conexión':'no connection',
// imagen compartida
'RETO DE LOS':'THE','15.000 GOLES':'15,000 GOALS CHALLENGE','RETO DIARIO':'DAILY CHALLENGE','PARTIDA LIBRE':'FREE PLAY','DUELO ONLINE':'ONLINE DUEL','RETO A UN AMIGO':'FRIEND CHALLENGE','RETO DE LOS 15.000 GOLES':'THE 15,000 GOALS CHALLENGE',
'¿Lo superas tú?':'Can you beat it?'
};
// Emoji Player: explicación en inglés (7.º campo de cada fila, si existe)
try{(window.GD_EMOJI||[]).forEach(function(r){if(r&&r[5]&&r[6])D[r[5]]=r[6];});}catch(e){}
function ord(n){n=+n;var t=n%100,u=n%10;return n+((t>10&&t<14)?'th':u===1?'st':u===2?'nd':u===3?'rd':'th');}
function pl(n,a,b){return n+' '+(n==='1'||n===1?a:b);}
var RULES=[
 [/^(\d+)º$/,function(m){return ord(m[1]);}],[/^(\d+)º del mundo$/,function(m){return ord(m[1])+' in the world';}],[/^vas (\d+)º$/,function(m){return 'you\'re '+ord(m[1]);}],
 [/^([\d.]+) puntos$/,'$1 points'],[/^desde ([\d.]+) puntos$/,'from $1 points'],[/^intento (\d+)$/,'guess $1'],
 [/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo), (\d+) de (\S+)$/,function(m){return {lunes:'Monday',martes:'Tuesday','miércoles':'Wednesday',jueves:'Thursday',viernes:'Friday','sábado':'Saturday',domingo:'Sunday'}[m[1]]+' '+m[2]+' '+tr1(m[3]);}],
 [/^(\S+) (\d{4})$/,function(m){var x=get(m[1]);return x&&/^[A-Z][a-z]+$/.test(x)?x+' '+m[2]:null;}],
 [/^No se ha podido guardar en el ranking \((.+)\)\.$/,'Couldn\'t save to the ranking ($1).'],
 [/^🌍 Guardado en el ranking( mundial)? como (.+)$/,function(m){return '🌍 Saved to the '+(m[1]?'world ':'')+'ranking as '+m[2];}],
 [/^Nombre registrado: (.+)$/,'Name registered: $1'],[/^🔥 Racha: (\d+) días?$/,function(m){return '🔥 Streak: '+pl(m[1],'day','days');}],
 // blackjack y más o menos
 [/^Goles en toda su carrera\. Objetivo entre ([\d.]+) y ([\d.]+)\.$/,'Career goals. Target between $1 and $2.'],
 [/^Goles con su selección\. Objetivo entre ([\d.]+) y ([\d.]+)\.$/,'National team goals. Target between $1 and $2.'],
 [/^Objetivo ([\d.]+)$/,'Target $1'],[/^La banca se planta en ([\d.]+)$/,'House stands on $1'],[/^([+−])([\d.]+) fichas$/,'$1$2 chips'],
 [/^([\d.]+ )?fichas tras (\d+) manos?$/,function(m){return (m[1]||'')+'chips after '+pl(m[2],'hand','hands');}],
 [/^No te quedan fichas para apostar tras (\d+) manos?$/,function(m){return 'Not enough chips left to bet after '+pl(m[1],'hand','hands');}],
 [/^Hoy: ([\d.]+) fichas$/,'Today: $1 chips'],[/^récord: ([\d.]+) fichas$/,'record: $1 chips'],
 [/^Récord: ([\d.]+) fichas$/,'Record: $1 chips'],[/^Récord: (\d+)$/,'Record: $1'],
 [/^aciertos? seguidos? · récord: (\d+)$/,'correct in a row · record: $1'],
 [/^Hoy: racha (\d+)$/,'Today: streak $1'],[/^Reto diario (\d+\/\d+(?:\/\d+)?)$/,'Daily challenge $1'],
 [/^(.+) tiene ([\d.]+) y (.+?) ([\d.]+)\.$/,'$1 has $2 and $3 has $4.'],[/^🔥 Racha de (\d+)$/,'🔥 Streak of $1'],
 // reto: partida
 [/^Jugador (\d+) de (\d+)$/,'Player $1 of $2'],[/^Liga ×5 de hoy: (.+)$/,'Today\'s ×5 league: $1'],[/^Descartes: (.*)$/,'Discards: $1'],
 [/^Reto diario del (.+)$/,'Daily challenge · $1'],
 [/^Ya has jugado el reto diario de hoy: ([\d.]+) puntos\. Vuelve mañana\.$/,'You\'ve already played today\'s daily challenge: $1 points. Come back tomorrow.'],
 [/^Hoy ya lo has jugado: ([\d.]+) puntos$/,'You\'ve already played today: $1 points'],
 [/^([\d.]+) para el objetivo$/,'$1 to the target'],[/^No llegas: te faltan ([\d.]+)$/,'Not there yet: $1 short'],
 [/^La mejor colocación posible de estos 17 daba ([\d.]+) puntos(, suficientes para el reto)?\.$/,function(m){return 'The best possible placement of these 17 would have given '+m[1]+' points'+(m[2]?', enough for the challenge.':'.');}],
 [/^en (.+) ×(\d+)$/,'in $1 ×$2'],[/^(.+?) de los jugadores llega aquí$/,'$1 of players get here'],
 [/^Siguiente rango: (.+)$/,'Next rank: $1'],[/^Siguiente: (.+)$/,'Next: $1'],[/^te faltan ([\d.]+) puntos en una partida$/,'you need $1 points in a single game'],
 [/^Nivel (\d+)$/,'Level $1'],[/^([\d.]+) XP para el siguiente nivel$/,'$1 XP to the next level'],
 [/^🏅 Logro: (.+)$/,'🏅 Achievement: $1'],[/^❓ Logro oculto: (.+)$/,'❓ Hidden achievement: $1'],
 [/^Mejor marca ([\d.]+)$/,'Best score $1'],[/^[Tt]e faltan ([\d.]+) para (.+)$/,'$1 more to reach $2'],
 [/^Tu rango sube con tu mejor puntuación; una vez alcanzado no se pierde\. Logros desbloqueados: (\d+) de (\d+) \((\d+) ocultos\)\.$/,'Your rank rises with your best score; once reached, it\'s never lost. Achievements unlocked: $1 of $2 ($3 hidden).'],
 [/^(\d+) jugador(es)? (en el reto de hoy|con récord)$/,function(m){return pl(m[1],'player','players')+(m[3]==='con récord'?' with a record':' in today\'s challenge');}],
 [/^(.+)\. Cada jugador aparece una vez, con su récord\.$/,'$1. Each player appears once, with their best score.'],
 [/^Juegas como: (.+)$/,'Playing as: $1'],
 // duelos
 [/^⬆️ ¡Ascenso a (.+?)!$/,'⬆️ Promoted to $1!'],[/^⬇️ Desciendes a (.+)$/,'⬇️ Relegated to $1'],
 [/^⚔️ Duelo contra (.+)$/,'⚔️ Duel against $1'],[/^🤝 Duelo amistoso contra (.+)$/,'🤝 Friendly duel against $1'],[/^🔗 Reto de (.+?) · (.+)$/,'🔗 $1\'s challenge · $2'],
 [/^Preparando el duelo con (.+?)…$/,'Preparing the duel with $1…'],
 [/^Esperando a que (.+?) acepte\. Le sale en su pantalla al acabar el duelo\.$/,'Waiting for $1 to accept. They\'ll see it on their screen when the duel ends.'],
 [/^Esperando a que (.+?) esté listo…$/,'Waiting for $1 to be ready…'],[/^Esperando a (.+?)…$/,'Waiting for $1…'],
 [/^La sala de (.+?) ya ha empezado o ha caducado\. Pídele que te mande un enlace nuevo\.$/,'$1\'s room has already started or expired. Ask them to send you a new link.'],
 [/^🔁 (.+?) quiere la revancha$/,'🔁 $1 wants a rematch'],[/^(.+?) ha jugado tu reto: (.+)$/,'$1 played your challenge: $2'],[/^([\d.]+) contra tus ([\d.]+)$/,'$1 vs your $2'],
 [/^(.+?) te reta$/,'$1 challenges you'],[/^¡(.+?) ha entrado!$/,'$1 has joined!'],[/^ganó a (.+)$/,'beat $1'],
 [/^🏆 Ganas: (.+?) no terminó$/,'🏆 You win: $1 didn\'t finish'],
 [/^Va por el jugador (\d+) de (\d+)\. Si se va, ganas tú\.$/,'They\'re on player $1 of $2. If they leave, you win.'],
 [/^Duelo (\d+) de 10 de clasificación: subes y bajas más rápido$/,'Placement duel $1 of 10: you move up and down faster'],
 [/^Siguiente categoría: (.+) a$/,'Next tier: $1 in'],
 [/^puntos para pasar al? (.+) \((\d+)º\)$/,function(m){return 'points to pass '+m[1]+' ('+ord(m[2])+')';}],
 [/^⬆️ subes (\d+) puestos?$/,function(m){return '⬆️ up '+pl(m[1],'place','places');}],[/^⬇️ bajas (\d+) puestos?$/,function(m){return '⬇️ down '+pl(m[1],'place','places');}],
 [/^(\d+) (victoria|derrota|empate)s?$/,function(m){var w={victoria:['win','wins'],derrota:['loss','losses'],empate:['draw','draws']}[m[2]];return pl(m[1],w[0],w[1]);}],
 [/^te quedan (\d+) duelos de clasificación \(subes más rápido\)$/,function(m){return pl(m[1],'placement duel','placement duels')+' left (you climb faster)';}],
 // temporadas
 [/^🏆 (.+?) · quedan (\d+) días$/,function(m){return '🏆 '+tr1(m[1])+' · '+pl(m[2],'day','days')+' left';}],
 [/^Temporada (\d+) · (.+)$/,'Season $1 · $2'],[/^Campeones de la Temporada (\d+) · (.+)$/,'Season $1 champions · $2'],
 [/^(.+) TEMPORADA (\d+)$/,'$1 · SEASON $2'],[/^Empieza la (.+)$/,'$1 starts'],
 [/^Fin de la Temporada (\d+) \((.+?)\): (quedaste|terminaste en)$/,function(m){return 'Season '+m[1]+' ('+tr1(m[2])+') is over: you finished'+(m[3]==='quedaste'?'':' in');}],
 [/^con ([\d.]+) puntos \((.+)\)\.$/,'with $1 points ($2).'],
 // retos por enlace y textos para compartir
 [/^Empezaste el reto de (.+?) y lo dejaste a medias\. Cada reto solo se puede jugar una vez\.$/,'You started $1\'s challenge and left it unfinished. Each challenge can only be played once.'],
 [/^Te tocarán los mismos 17 jugadores, en el mismo orden y con la misma liga ×5 que le tocaron a (.+?)\. Verás su puntuación al terminar\.$/,'You\'ll get the same 17 players, in the same order and with the same ×5 league as $1. You\'ll see their score when you finish.'],
 [/^⚔️ He hecho ([\d.]+) puntos en el Reto de los 15\.000 goles\. Te tocan mis mismos 17 jugadores\. ¿Me ganas\?$/,'⚔️ I scored $1 points in the 15,000 Goals Challenge. You get my same 17 players. Can you beat me?'],
 [/^⚔️ Te reto a un duelo en directo en el Reto de los 15\.000 goles\. Entra y jugamos a la vez:(.*)$/,'⚔️ I challenge you to a live duel in the 15,000 Goals Challenge. Join and we play at the same time:$1'],
 [/^⚔️ Te reto a un duelo en el Reto de los 15\.000 goles\. Entra y dale a buscar rival:(.*)$/,'⚔️ I challenge you to a duel in the 15,000 Goals Challenge. Join and tap find opponent:$1'],
 [/^⚔️ Te reto en el Reto de los 15\.000 goles: te tocan mis mismos 17 jugadores\. ¿Me ganas\?(.*)$/,'⚔️ I challenge you in the 15,000 Goals Challenge: you get my same 17 players. Can you beat me?$1'],
 [/^(Reto diario )?Reto de los 15\.000 goles ⚽ ([\d.]+) puntos · (.+?)\. ¿Lo superas\?(.*)$/,function(m){return (m[1]?'Daily challenge · ':'')+'15,000 Goals Challenge ⚽ '+m[2]+' points · '+tr1(m[3])+'. Can you beat it?'+m[4];}],
 [/^Medalla (.+?) · la consiguen (.+?) de los jugadores$/,'$1 medal · achieved by $2 of players'],[/^Me faltaron ([\d.]+) puntos$/,'I was $1 points short']
];
var lang='es';
// Idioma por defecto: español para navegadores en español, catalán, gallego o euskera; inglés para el resto del mundo
// (EE. UU., Reino Unido, Alemania, países nórdicos…), que es donde más pagan los anuncios.
function defLang(){var l=((navigator.languages&&navigator.languages[0])||navigator.language||'').toLowerCase().slice(0,2);return /^(es|ca|gl|eu)$/.test(l)?'es':'en';}
try{lang=localStorage.getItem(KEY)||defLang();}catch(e){lang=defLang();}
function get(k){return Object.prototype.hasOwnProperty.call(D,k)?D[k]:null;}
// claves en MAYÚSCULAS (medallas y rarezas de la imagen, títulos de temporada…)
var UP=null;
function upper(k){if(!UP){UP={};for(var x in D)if(Object.prototype.hasOwnProperty.call(D,x)&&x.toUpperCase()!==x)UP[x.toUpperCase()]=D[x].toUpperCase();}return Object.prototype.hasOwnProperty.call(UP,k)?UP[k]:null;}
// Traduce un texto: frase exacta, reglas (con sus huecos traducidos también), sin el prefijo de emoji/símbolos,
// sin el punto final o por trozos separados con ' · ' o saltos de línea. Lo que no se reconoce se deja igual.
function tr1(s){
  var m=s.match(/^(\s*)([\s\S]*?)(\s*)$/),c=m[2],o,p,i;
  if(!c)return s;
  o=get(c);
  if(o==null&&c===c.toUpperCase())o=upper(c);
  for(i=0;o==null&&i<RULES.length;i++){p=c.match(RULES[i][0]);if(p)o=typeof RULES[i][1]==='function'?RULES[i][1](p):RULES[i][1].replace(/\$(\d)/g,function(_,n){return tr1(p[n]||'');});}
  [/^([^0-9A-Za-zÀ-ÿ¿¡]+)([\s\S]*[0-9A-Za-zÀ-ÿ¿][\s\S]*)$/,/^([^0-9A-Za-zÀ-ÿ¿]+)([\s\S]*[0-9A-Za-zÀ-ÿ¿][\s\S]*)$/].forEach(function(r){if(o==null&&(p=c.match(r))){i=tr1(p[2]);if(i!==p[2])o=p[1]+i;}});
  if(o==null&&/[^.]\.$/.test(c)){i=tr1(c.slice(0,-1));if(i!==c.slice(0,-1))o=i+'.';}
  if(o==null&&/\n| · /.test(c)){p=c.indexOf('\n')>=0?'\n':' · ';o=c.split(p).map(tr1).join(p);}
  return m[1]+(o==null?c:o)+m[3];
}
// números: 12.405 → 12,405 y 0,7 → 0.7 (las fechas 25/09/2026 no se tocan)
function num(s){return s.replace(/\d+(?:[.,]\d+)+/g,function(x){if(/^[1-9]\d{0,2}(\.\d{3})+$/.test(x))return x.replace(/\./g,',');if(/^\d+,\d+$/.test(x)&&(/^0,/.test(x)||!/,\d{3}$/.test(x)))return x.replace(',','.');return x;});}
function tr(s){
  if(lang!=='en'||!s)return s;
  return num(tr1(String(s)));
}
var ATTRS=['title','aria-label','placeholder','alt'];
function node(n){
  if(n.nodeType===3){
    if(n.parentNode&&/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName))return;
    if(n.__en!==undefined&&n.nodeValue===n.__en)return;
    n.__es=n.nodeValue;var v=tr(n.__es);n.__en=v;if(v!==n.nodeValue)n.nodeValue=v;
  }else if(n.nodeType===1){
    ATTRS.forEach(function(a){if(n.hasAttribute(a)){var k='__es_'+a;if(n[k]===undefined||n.getAttribute(a)!==n['__en_'+a]){n[k]=n.getAttribute(a);}var v=tr(n[k]);n['__en_'+a]=v;if(v!==n.getAttribute(a))n.setAttribute(a,v);}});
  }
}
function walk(root){
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null);
  node(root);while(w.nextNode())node(w.currentNode);
}
function restore(root){
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null),n;
  while(n=w.nextNode()){
    if(n.nodeType===3&&n.__es!==undefined){n.nodeValue=n.__es;n.__en=undefined;}
    if(n.nodeType===1)ATTRS.forEach(function(a){if(n['__es_'+a]!==undefined)n.setAttribute(a,n['__es_'+a]);});
  }
}
var obs;
function start(){
  document.documentElement.lang=lang;
  if(T0===null)T0=document.title;
  if(lang==='en'){walk(document.body);document.title=tr(T0);}
  else {document.title=T0;}
  if(obs)obs.disconnect();
  if(lang!=='en')return;
  obs=new MutationObserver(function(ms){
    ms.forEach(function(m){
      if(m.type==='characterData')node(m.target);
      else if(m.type==='attributes')node(m.target);
      else m.addedNodes.forEach(function(a){if(a.nodeType===1)walk(a);else if(a.nodeType===3)node(a);});
    });
  });
  obs.observe(document.body,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:ATTRS});
}
// texto de la imagen para compartir
var ft=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(t){var a=Array.prototype.slice.call(arguments);a[0]=tr(String(t));return ft.apply(this,a);};
// textos que se comparten (navigator.share / portapapeles)
if(navigator.share){var sh=navigator.share.bind(navigator);navigator.share=function(d){if(d&&d.text)d.text=tr(d.text);if(d&&d.title)d.title=tr(d.title);return sh(d);};}
if(navigator.clipboard&&navigator.clipboard.writeText){var wt=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=function(t){return wt(tr(String(t)));};}
// mensajes de prompt / alert / confirm
['prompt','alert','confirm'].forEach(function(f){var o=window[f];if(typeof o==='function')window[f]=function(m){var a=Array.prototype.slice.call(arguments);if(a.length)a[0]=tr(String(m));return o.apply(window,a);};});
function set(l){
  try{localStorage.setItem(KEY,l);}catch(e){}
  if(l===lang){return;}
  if(lang==='en'){if(obs)obs.disconnect();obs=null;restore(document.body);}
  lang=l;start();
  var b=document.getElementById('btnLang');if(b)b.textContent=lang==='en'?'🌐 ES':'🌐 EN';
}
document.addEventListener('DOMContentLoaded',function(){
  start();
  var b=document.getElementById('btnLang');
  if(b){b.textContent=lang==='en'?'🌐 ES':'🌐 EN';b.onclick=function(){set(lang==='en'?'es':'en');};}
});
window.FG_LANG={tr:tr,set:set,get:function(){return lang;}};
})();
