/* =====================================================================
   GOL DEL DÍA · calendario de goles
   ---------------------------------------------------------------------
   Cada día sale el siguiente gol de esta lista, empezando por INICIO.
   Para cada gol:
     yt    : id del vídeo de YouTube (lo que va después de "v=" en el
             enlace). Es lo normal: no hay que subir ningún archivo.
     video : (alternativa) ruta de un clip mp4 dentro del repo (goles/).
             Solo se usa si no hay yt.
     desde : segundo del vídeo donde empieza la jugada
     corte : segundo donde se CORTA la pregunta (justo antes del gol).
             Después de responder se ve el clip entero y en color.
     hasta : (opcional) segundo donde parar al ver el gol completo.
     tapar : (opcional) rectángulos negros para tapar marcador, logos…
             en % del vídeo: {x, y, w, h}.
     color : (opcional) true si NO quieres el blanco y negro en ese clip.
   Para probar un gol concreto antes de su día:  gol-del-dia.html?dia=5
   ===================================================================== */
const INICIO='2026-09-25';

const GOLES=[
{yt:'kZNK9Wfkou4',desde:0,corte:10,hasta:25,
 name:'Diego Maradona',flag:'🇦🇷',
 h:['Mundial 1986 · Cuartos de final','Arranca desde su propio campo y regatea a cinco rivales, portero incluido','🇦🇷 Argentina'],
 mt:'Argentina 2-1 Inglaterra · Mundial México 1986 · min 55',
 tx:'El «Gol del Siglo»: recibe de Héctor Enrique en su campo y deja atrás a Beardsley, Reid, Butcher, Fenwick y Shilton.'},

{yt:'',desde:0,corte:8,
 name:'Andrés Iniesta',flag:'🇪🇸',
 h:['Final del Mundial 2010','Minuto 116 de la prórroga','🇪🇸 España'],
 mt:'España 1-0 Países Bajos · Final del Mundial 2010 · min 116',
 tx:'Cesc Fàbregas se la deja en la derecha del área y la empalma de media volea. España campeona del mundo.'},

{yt:'',desde:0,corte:6,
 name:'Zinedine Zidane',flag:'🇫🇷',
 h:['Final de la Champions 2002','Volea de zurda tras un centro bombeado desde la izquierda','🇫🇷 Francia'],
 mt:'Real Madrid 2-1 Bayer Leverkusen · Final de Champions 2002, Glasgow · min 45',
 tx:'Roberto Carlos la cuelga desde la banda izquierda y la engancha de volea con la zurda a la escuadra.'},

{yt:'',desde:0,corte:6,
 name:'Cristiano Ronaldo',flag:'🇵🇹',
 h:['Champions 2017/18 · Cuartos de final','Remate de chilena; hasta la afición rival lo aplaudió','🇵🇹 Portugal'],
 mt:'Juventus 0-3 Real Madrid · Champions 2017/18 · min 64',
 tx:'Centro de Carvajal desde la derecha y chilena a casi dos metros y medio de altura ante Buffon.'},

{yt:'',desde:0,corte:4,
 name:'Roberto Carlos',flag:'🇧🇷',
 h:['Torneo de Francia 1997 (amistoso)','Falta directa desde unos 35 metros','🇧🇷 Brasil'],
 mt:'Brasil 1-1 Francia · Torneo de Francia 1997',
 tx:'La falta imposible: el balón sale muy abierto por fuera de la barrera y se cierra de golpe hacia la portería.'},

{yt:'',desde:0,corte:6,
 name:'Marco van Basten',flag:'🇳🇱',
 h:['Final de la Eurocopa 1988','Volea desde un ángulo casi imposible, al segundo palo','🇳🇱 Países Bajos'],
 mt:'Países Bajos 2-0 URSS · Final de la Eurocopa 1988 · min 54',
 tx:'Arnold Mühren cruza el balón de banda a banda y lo remata de volea, sin dejarla caer, por encima de Dasáyev.'},

{yt:'',desde:0,corte:5,
 name:'Dennis Bergkamp',flag:'🇳🇱',
 h:['Premier League 2001/02','De espaldas: la toca por un lado del defensa y él se va por el otro','🇳🇱 Países Bajos'],
 mt:'Newcastle 0-2 Arsenal · Premier League, marzo de 2002 · min 11',
 tx:'Pase raso de Robert Pires, control-pirueta que deja tirado a Dabizas y definición ante Given.'},

{yt:'',desde:0,corte:6,
 name:'Zlatan Ibrahimović',flag:'🇸🇪',
 h:['Amistoso internacional 2012','Chilena desde unos 30 metros con el portero fuera del área','🇸🇪 Suecia'],
 mt:'Suecia 4-2 Inglaterra · Amistoso, noviembre de 2012 · min 90+1',
 tx:'Joe Hart sale a despejar de cabeza fuera del área y el balón le cae de espaldas: chilena a puerta vacía. Premio Puskás 2013.'},

{yt:'',desde:0,corte:5,
 name:'Gareth Bale',flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
 h:['Final de la Champions 2018','Salió del banquillo y remató de chilena','🏴󠁧󠁢󠁷󠁬󠁳󠁿 Gales'],
 mt:'Real Madrid 3-1 Liverpool · Final de Champions 2018, Kiev · min 64',
 tx:'A los pocos minutos de salir, Marcelo centra desde la izquierda y la mete de chilena por la escuadra.'},

{yt:'',desde:0,corte:5,
 name:'Sergio Ramos',flag:'🇪🇸',
 h:['Final de la Champions 2014','Cabezazo a la salida de un córner en el minuto 93','🇪🇸 España'],
 mt:'Real Madrid 4-1 Atlético (1-1 en los 90) · Final de Champions 2014, Lisboa · min 92:48',
 tx:'Córner de Luka Modrić y cabezazo que fuerza la prórroga. De ahí sale la Décima.'},

{yt:'',desde:0,corte:8,
 name:'Sergio Agüero',flag:'🇦🇷',
 h:['Premier League 2011/12 · Última jornada','Minuto 93:20: el gol que decidió la liga','🇦🇷 Argentina'],
 mt:'Manchester City 3-2 QPR · Premier League, mayo de 2012 · min 93:20',
 tx:'Pared con Balotelli, que se la deja cayéndose, y disparo que da la primera Premier al City en 44 años.'},

{yt:'',desde:0,corte:12,
 name:'Carlos Alberto',flag:'🇧🇷',
 h:['Final del Mundial 1970','Jugada colectiva que termina en el lateral derecho, llegando desde atrás','🇧🇷 Brasil'],
 mt:'Brasil 4-1 Italia · Final del Mundial México 1970 · min 86',
 tx:'Clodoaldo, Rivelino, Jairzinho y Pelé, que la deja rodar a la derecha para el disparo del capitán.'},

{yt:'',desde:0,corte:6,
 name:'Mario Götze',flag:'🇩🇪',
 h:['Final del Mundial 2014','Controla con el pecho y remata sin dejarla caer, minuto 113','🇩🇪 Alemania'],
 mt:'Alemania 1-0 Argentina · Final del Mundial 2014, Maracaná · min 113',
 tx:'André Schürrle arranca por la izquierda y centra; control con el pecho y volea de zurda cruzada.'},

{yt:'',desde:0,corte:6,
 name:'Benjamin Pavard',flag:'🇫🇷',
 h:['Mundial 2018 · Octavos de final','Un lateral, desde la frontal, golpeando con el exterior','🇫🇷 Francia'],
 mt:'Francia 4-3 Argentina · Mundial Rusia 2018 · min 57',
 tx:'El centro de Lucas Hernández cruza toda el área y le llega botando: volea con el exterior que se cierra a la escuadra.'},

{yt:'',desde:0,corte:6,
 name:'Andrés Iniesta',flag:'🇪🇸',
 h:['Champions 2008/09 · Semifinal, vuelta','Disparo desde la frontal en el descuento','🇪🇸 España'],
 mt:'Chelsea 1-1 Barcelona · Semifinal de Champions 2009, Stamford Bridge · min 90+3',
 tx:'Tras un rechace, Messi atrae a los defensas y se la deja atrás: zapatazo a la escuadra de Čech.'},

{yt:'',desde:0,corte:5,
 name:'Ronaldinho',flag:'🇧🇷',
 h:['Champions 2004/05 · Octavos, vuelta','Parado, amaga con la cadera y dispara de puntera','🇧🇷 Brasil'],
 mt:'Chelsea 4-2 Barcelona · Champions 2004/05, Stamford Bridge',
 tx:'Rodeado de defensas y sin carrera, un par de amagos de cadera y un puntazo que Čech no llega ni a ver.'},

{yt:'',desde:0,corte:5,
 name:'James Rodríguez',flag:'🇨🇴',
 h:['Mundial 2014 · Octavos de final','Control con el pecho de espaldas, se gira y volea de zurda','🇨🇴 Colombia'],
 mt:'Colombia 2-0 Uruguay · Mundial Brasil 2014 · min 28',
 tx:'Abel Aguilar se la baja de cabeza, controla con el pecho y la clava por dentro del larguero. Premio Puskás 2014.'},

{yt:'',desde:0,corte:4,
 name:'David Beckham',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
 h:['Premier League 1996/97 · Primera jornada','Desde el centro del campo, con el portero adelantado','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra'],
 mt:'Wimbledon 0-3 Manchester United · Premier League, agosto de 1996',
 tx:'Ve adelantado a Neil Sullivan y le bombea el balón desde el medio del campo.'},

{yt:'',desde:0,corte:11,
 name:'Lionel Messi',flag:'🇦🇷',
 h:['Copa del Rey 2006/07 · Semifinal, ida','Recibe en la banda derecha, en su campo, y se va de todos','🇦🇷 Argentina'],
 mt:'Barcelona 5-2 Getafe · Copa del Rey 2007 · min 29',
 tx:'Recibe de Xavi cerca del medio campo, regatea a medio equipo y al portero. El gol que todos compararon con el de México 86.'},

{yt:'',desde:0,corte:5,
 name:'Wayne Rooney',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
 h:['Premier League 2010/11 · Derbi','Chilena tras un centro desviado desde la derecha','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra'],
 mt:'Manchester United 2-1 Manchester City · Premier League, febrero de 2011 · min 78',
 tx:'El centro de Nani toca en un defensa y se queda en el aire: chilena a la escuadra para ganar el derbi.'},

{yt:'',desde:0,corte:5,
 name:'Lionel Messi',flag:'🇦🇷',
 h:['Final de la Champions 2009','Un gol de cabeza de un jugador bajito','🇦🇷 Argentina'],
 mt:'Barcelona 2-0 Manchester United · Final de Champions 2009, Roma · min 70',
 tx:'Xavi la cuelga desde la derecha y, entre los centrales, cabecea por encima de Van der Sar.'}
];
