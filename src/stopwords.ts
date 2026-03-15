/**
 * Stopwords for multiple languages
 * Source: NLTK stopwords lists
 */

export const STOPWORDS_EN = Object.freeze([
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
  "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
  "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
  "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
  "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
  "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
  "at", "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
  "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just",
  "don", "should", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren",
  "couldn", "didn", "doesn", "hadn", "hasn", "haven", "isn", "ma", "mightn",
  "mustn", "needn", "shan", "shouldn", "wasn", "weren", "won", "wouldn"
] as const);

export const STOPWORDS_EN_PLUS = Object.freeze([
  ...STOPWORDS_EN,
  "also", "could", "would", "may", "might", "must", "shall", "should",
  "need", "ought", "would", "going", "get", "got", "gets", "getting"
] as const);

export const STOPWORDS_GERMAN = Object.freeze([
  "aber", "alle", "allem", "allen", "aller", "alles", "als", "also", "am",
  "an", "ander", "andere", "anderem", "anderen", "anderer", "anderes",
  "anders", "auch", "auf", "aus", "bei", "bin", "bis", "bist", "da", "damit",
  "dann", "das", "dasselbe", "dazu", "daß", "dein", "deine", "deinem",
  "deinen", "deiner", "deines", "dem", "demselben", "den", "denn", "denselben",
  "der", "derer", "derselbe", "derselben", "des", "desselben", "dessen",
  "dich", "die", "dies", "diese", "dieselbe", "dieselben", "diesem", "diesen",
  "dieser", "dieses", "dir", "doch", "dort", "du", "durch", "ein", "eine",
  "einem", "einen", "einer", "eines", "einig", "einige", "einigem", "einigen",
  "einiger", "einiges", "einmal", "er", "es", "etwas", "euch", "euer", "eure",
  "eurem", "euren", "eurer", "eures", "für", "gegen", "gewesen", "hab", "habe",
  "haben", "hat", "hatte", "hatten", "hier", "hin", "hinter", "ich", "ihm",
  "ihn", "ihnen", "ihr", "ihre", "ihrem", "ihren", "ihrer", "ihres", "im",
  "in", "indem", "ins", "ist", "jede", "jedem", "jeden", "jeder", "jedes",
  "jene", "jenem", "jenen", "jener", "jenes", "jetzt", "kann", "kein", "keine",
  "keinem", "keinen", "keiner", "keines", "können", "könnte", "machen", "man",
  "manche", "manchem", "manchen", "mancher", "manches", "mein", "meine",
  "meinem", "meinen", "meiner", "meines", "mit", "muss", "musste", "nach",
  "nicht", "nichts", "noch", "nun", "nur", "ob", "oder", "ohne", "sehr",
  "sein", "seine", "seinem", "seinen", "seiner", "seines", "selbst", "sich",
  "sie", "sind", "so", "solche", "solchem", "solchen", "solcher", "solches",
  "soll", "sollte", "sondern", "sonst", "über", "um", "und", "uns", "unser",
  "unsere", "unserem", "unseren", "unserer", "unseres", "unter", "viel",
  "vom", "von", "vor", "während", "war", "waren", "warst", "was", "weg",
  "weil", "weiter", "welche", "welchem", "welchen", "welcher", "welches",
  "wenn", "werde", "werden", "wie", "wieder", "will", "wir", "wird", "wirst",
  "wo", "wollen", "wollte", "würde", "würden", "zu", "zum", "zur", "zwar",
  "zwischen"
] as const);

export const STOPWORDS_FRENCH = Object.freeze([
  "ai", "aie", "aient", "aies", "ait", "as", "au", "aura", "aurai", "auraient",
  "aurais", "aurait", "auras", "aurez", "auriez", "aurions", "aurons", "auront",
  "aux", "avaient", "avais", "avait", "avec", "avez", "aviez", "avions", "avons",
  "ayant", "ayez", "ayons", "c", "ce", "ceci", "cela", "celà", "ces", "cet",
  "cette", "d", "dans", "de", "des", "du", "elle", "elles", "en", "es", "est",
  "et", "eu", "eue", "eues", "eurent", "eus", "eusse", "eussent", "eusses",
  "eussiez", "eussions", "eut", "eux", "eûmes", "eût", "eûtes", "furent", "fus",
  "fusse", "fussent", "fusses", "fussiez", "fussions", "fut", "fûmes", "fût",
  "fûtes", "ici", "il", "ils", "j", "je", "l", "la", "le", "les", "leur",
  "leurs", "lui", "m", "ma", "mais", "me", "mes", "moi", "mon", "même", "n",
  "ne", "ni", "nos", "notre", "nous", "on", "ont", "ou", "où", "par", "pas",
  "pour", "qu", "que", "quel", "quelle", "quelles", "quels", "qui", "s", "sa",
  "sans", "se", "sera", "serai", "seraient", "serais", "serait", "seras",
  "serez", "seriez", "serions", "serons", "seront", "ses", "soi", "soient",
  "sois", "soit", "sommes", "son", "sont", "soyez", "soyons", "suis", "sur",
  "t", "ta", "te", "tes", "toi", "ton", "tu", "un", "une", "vos", "votre",
  "vous", "y", "à", "étaient", "étais", "était", "étant", "étiez", "étions",
  "été", "étée", "étées", "étés", "êtes"
] as const);

export const STOPWORDS_SPANISH = Object.freeze([
  "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con",
  "contra", "cual", "cuando", "de", "del", "desde", "donde", "durante", "e",
  "el", "ella", "ellas", "ellos", "en", "entre", "era", "erais", "eran",
  "eras", "eres", "es", "esa", "esas", "ese", "eso", "esos", "esta", "estaba",
  "estabais", "estaban", "estabas", "estad", "estada", "estadas", "estado",
  "estados", "estamos", "estando", "estar", "estaremos", "estará", "estarán",
  "estarás", "estaré", "estaréis", "estaría", "estaríais", "estaríamos",
  "estarían", "estarías", "estas", "este", "estemos", "esto", "estos", "estoy",
  "estuve", "estuviera", "estuvierais", "estuvieran", "estuvieras", "estuvieron",
  "estuviese", "estuvieseis", "estuviesen", "estuvieses", "estuvimos",
  "estuviste", "estuvisteis", "estuviéramos", "estuviésemos", "estuvo", "está",
  "estábamos", "estáis", "están", "estás", "esté", "estéis", "estén", "estés",
  "fue", "fuera", "fuerais", "fueran", "fueras", "fueron", "fuese", "fueseis",
  "fuesen", "fueses", "fui", "fuimos", "fuiste", "fuisteis", "fuéramos",
  "fuésemos", "ha", "habida", "habidas", "habido", "habidos", "habiendo",
  "habremos", "habrá", "habrán", "habrás", "habré", "habréis", "habría",
  "habríais", "habríamos", "habrían", "habrías", "habéis", "había", "habíais",
  "habíamos", "habían", "habías", "han", "has", "hasta", "hay", "haya",
  "hayamos", "hayan", "hayas", "hayáis", "he", "hemos", "hube", "hubiera",
  "hubierais", "hubieran", "hubieras", "hubieron", "hubiese", "hubieseis",
  "hubiesen", "hubieses", "hubimos", "hubiste", "hubisteis", "hubiéramos",
  "hubiésemos", "hubo", "la", "las", "le", "les", "lo", "los", "me", "mi",
  "mis", "mucho", "muchos", "muy", "más", "mí", "mía", "mías", "mío", "míos",
  "nada", "ni", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras",
  "nuestro", "nuestros", "o", "os", "otra", "otras", "otro", "otros", "para",
  "pero", "poco", "por", "porque", "que", "quien", "quienes", "qué", "se",
  "sea", "seamos", "sean", "seas", "seremos", "será", "serán", "serás", "seré",
  "seréis", "sería", "seríais", "seríamos", "serían", "serías", "seáis", "si",
  "sido", "siendo", "sin", "sobre", "sois", "somos", "son", "soy", "su", "sus",
  "suya", "suyas", "suyo", "suyos", "sí", "también", "tanto", "te", "tendremos",
  "tendrá", "tendrán", "tendrás", "tendré", "tendréis", "tendría", "tendríais",
  "tendríamos", "tendrían", "tendrías", "tened", "tenemos", "tenga", "tengamos",
  "tengan", "tengas", "tengo", "tengáis", "tenida", "tenidas", "tenido",
  "tenidos", "teniendo", "tenéis", "tenía", "teníais", "teníamos", "tenían",
  "tenías", "ti", "tiene", "tienen", "tienes", "todo", "todos", "tu", "tus",
  "tuve", "tuviera", "tuvierais", "tuvieran", "tuvieras", "tuvieron", "tuviese",
  "tuvieseis", "tuviesen", "tuvieses", "tuvimos", "tuviste", "tuvisteis",
  "tuviéramos", "tuviésemos", "tuvo", "tuya", "tuyas", "tuyo", "tuyos", "tú",
  "un", "una", "uno", "unos", "vosotras", "vosotros", "vuestra", "vuestras",
  "vuestro", "vuestros", "y", "ya", "yo", "él", "éramos"
] as const);

export const STOPWORDS_PORTUGUESE = Object.freeze([
  "a", "ao", "aos", "aquela", "aquelas", "aquele", "aqueles", "aquilo", "as",
  "até", "com", "como", "da", "das", "de", "dela", "delas", "dele", "deles",
  "depois", "do", "dos", "e", "ela", "elas", "ele", "eles", "em", "entre",
  "era", "eram", "essa", "essas", "esse", "esses", "esta", "estamos", "estas",
  "estava", "estavam", "este", "esteja", "estejam", "estejamos", "estes",
  "esteve", "estive", "estivemos", "estiver", "estivera", "estiveram",
  "estiverem", "estivermos", "estivesse", "estivessem", "estivéramos",
  "estivéssemos", "estou", "está", "estávamos", "estão", "eu", "foi", "fomos",
  "for", "fora", "foram", "forem", "formos", "fosse", "fossem", "fui",
  "fôramos", "fôssemos", "haja", "hajam", "hajamos", "havemos", "hei", "houve",
  "houvemos", "houver", "houvera", "houveram", "houverei", "houverem",
  "houveremos", "houveria", "houveriam", "houvermos", "houverá", "houverão",
  "houveríamos", "houvesse", "houvessem", "houvéramos", "houvéssemos", "há",
  "hão", "isso", "isto", "já", "lhe", "lhes", "mais", "mas", "me", "mesmo",
  "meu", "meus", "minha", "minhas", "muito", "na", "nas", "nem", "no", "nos",
  "nossa", "nossas", "nosso", "nossos", "num", "numa", "não", "nós", "o", "os",
  "ou", "para", "pela", "pelas", "pelo", "pelos", "por", "qual", "quando",
  "que", "quem", "se", "seja", "sejam", "sejamos", "sem", "ser", "sera",
  "serei", "seremos", "seria", "seriam", "será", "serão", "seríamos", "seu",
  "seus", "somos", "sou", "sua", "suas", "são", "só", "também", "te", "tem",
  "temos", "tenha", "tenham", "tenhamos", "tenho", "ter", "terei", "teremos",
  "teria", "teriam", "terá", "terão", "teríamos", "teu", "teus", "teve",
  "tinha", "tinham", "tive", "tivemos", "tiver", "tivera", "tiveram", "tiverem",
  "tivermos", "tivesse", "tivessem", "tivéramos", "tivéssemos", "tu", "tua",
  "tuas", "tém", "tínhamos", "um", "uma", "você", "vocês", "vos", "à", "às",
  "é", "éramos"
] as const);

export const STOPWORDS_ITALIAN = Object.freeze([
  "a", "abbia", "abbiamo", "abbiano", "abbiate", "ad", "agl", "agli", "ai",
  "al", "all", "alla", "alle", "allo", "anche", "avemmo", "avendo", "avere",
  "avesse", "avessero", "avessi", "avessimo", "aveste", "avesti", "avete",
  "aveva", "avevamo", "avevano", "avevate", "avevi", "avevo", "avrai",
  "avranno", "avrebbe", "avrebbero", "avrei", "avremmo", "avremo", "avreste",
  "avresti", "avrete", "avrà", "avrò", "avuta", "avute", "avuti", "avuto", "c",
  "che", "chi", "ci", "coi", "col", "come", "con", "contro", "cui", "da",
  "dagl", "dagli", "dai", "dal", "dall", "dalla", "dalle", "dallo", "degl",
  "degli", "dei", "del", "dell", "della", "delle", "dello", "di", "dov",
  "dove", "e", "ebbe", "ebbero", "ebbi", "ed", "era", "erano", "eravamo",
  "eravate", "eri", "ero", "essendo", "faccia", "facciamo", "facciano",
  "facciate", "faccio", "facemmo", "facendo", "facesse", "facessero", "facessi",
  "facessimo", "faceste", "facesti", "faceva", "facevamo", "facevano",
  "facevate", "facevi", "facevo", "fai", "fanno", "farai", "faranno", "farebbe",
  "farebbero", "farei", "faremmo", "faremo", "fareste", "faresti", "farete",
  "farà", "farò", "fece", "fecero", "feci", "fosse", "fossero", "fossi",
  "fossimo", "foste", "fosti", "fu", "fui", "fummo", "furono", "gli", "ha",
  "hai", "hanno", "ho", "i", "il", "in", "io", "l", "la", "le", "lei", "li",
  "lo", "loro", "lui", "ma", "mi", "mia", "mie", "miei", "mio", "ne", "negl",
  "negli", "nei", "nel", "nell", "nella", "nelle", "nello", "noi", "non",
  "nostra", "nostre", "nostri", "nostro", "o", "per", "perché", "più", "quale",
  "quanta", "quante", "quanti", "quanto", "quella", "quelle", "quelli",
  "quello", "questa", "queste", "questi", "questo", "sarai", "saranno",
  "sarebbe", "sarebbero", "sarei", "saremmo", "saremo", "sareste", "saresti",
  "sarete", "sarà", "sarò", "se", "sei", "si", "sia", "siamo", "siano", "siate",
  "siete", "sono", "sta", "stai", "stando", "stanno", "starai", "staranno",
  "starebbe", "starebbero", "starei", "staremmo", "staremo", "stareste",
  "staresti", "starete", "starà", "starò", "stava", "stavamo", "stavano",
  "stavate", "stavi", "stavo", "stemmo", "stesse", "stessero", "stessi",
  "stessimo", "steste", "stesti", "stette", "stettero", "stetti", "stia",
  "stiamo", "stiano", "stiate", "sto", "su", "sua", "sue", "sugl", "sugli",
  "sui", "sul", "sull", "sulla", "sulle", "sullo", "suo", "suoi", "ti", "tra",
  "tu", "tua", "tue", "tuo", "tuoi", "tutti", "tutto", "un", "una", "uno",
  "vi", "voi", "vostra", "vostre", "vostri", "vostro", "è"
] as const);

export const STOPWORDS_DUTCH = Object.freeze([
  "aan", "af", "al", "als", "bij", "dan", "dat", "de", "die", "dit", "een",
  "en", "er", "had", "heb", "hem", "het", "hij", "hoe", "hun", "ik", "in",
  "is", "je", "kan", "me", "men", "met", "mij", "nog", "nu", "of", "ons",
  "ook", "op", "over", "te", "tot", "u", "uit", "um", "van", "veel", "voor",
  "was", "wat", "we", "wel", "wij", "zal", "ze", "zei", "zij", "zo", "zou"
] as const);

export const STOPWORDS_RUSSIAN = Object.freeze([
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
  "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
  "бы", "по", "только", "её", "мне", "было", "вот", "от", "меня", "ещё",
  "нет", "о", "из", "ему", "теперь", "когда", "уже", "вам", "ни", "быть",
  "был", "него", "до", "вас", "нибудь", "опять", "уж", "вам", "ведь", "там",
  "потом", "себя", "ничего", "ей", "может", "они", "тут", "где", "есть",
  "надо", "ней", "для", "мы", "тебя", "их", "чем", "была", "сам", "чтоб",
  "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет", "ж", "тогда",
  "кто", "этот", "того", "потому", "этого", "какой", "совсем", "ним", "здесь",
  "этом", "один", "почти", "мой", "тем", "чтобы", "нее", "сейчас", "были",
  "куда", "зачем", "всех", "никогда", "можно", "при", "наконец", "два", "об",
  "другой", "хоть", "после", "над", "больше", "тот", "через", "эти", "нас",
  "про", "всего", "них", "какая", "много", "разве", "три", "эту", "моя",
  "впрочем", "хорошо", "свою", "этой", "перед", "иногда", "лучше", "чуть",
  "том", "нельзя", "такой", "им", "более", "всегда", "конечно", "всю", "между"
] as const);

export const STOPWORDS_SWEDISH = Object.freeze([
  "alla", "allt", "att", "av", "blev", "bli", "blir", "blivit", "de", "dem",
  "den", "denna", "deras", "dess", "dessa", "det", "detta", "dig", "din",
  "dina", "ditt", "du", "där", "då", "efter", "ej", "eller", "en", "er", "era",
  "ert", "ett", "från", "för", "ha", "hade", "han", "hans", "har", "henne",
  "hennes", "hon", "honom", "hur", "här", "i", "icke", "ingen", "inom", "inte",
  "jag", "ju", "kan", "kunde", "man", "med", "mellan", "men", "mig", "min",
  "mina", "mitt", "mot", "mycket", "ni", "nu", "när", "någon", "något", "några",
  "och", "om", "oss", "på", "samma", "sedan", "sig", "sin", "sina", "sitta",
  "själv", "skulle", "som", "så", "sådan", "sådana", "sådant", "till", "under",
  "upp", "ut", "utan", "var", "vara", "varför", "varit", "varje", "vars",
  "vart", "vem", "vi", "vid", "vilka", "vilkas", "vilken", "vilket", "vår",
  "våra", "vårt", "än", "är", "åt", "över"
] as const);

export const STOPWORDS_NORWEGIAN = Object.freeze([
  "alle", "at", "av", "bare", "begge", "ble", "blei", "bli", "blir", "blitt",
  "både", "båe", "da", "de", "deg", "dei", "deim", "deira", "deires", "dem",
  "den", "denne", "der", "dere", "deres", "det", "dette", "di", "din", "dine",
  "disse", "ditt", "du", "dykk", "dykkar", "då", "eg", "ein", "eit", "eitt",
  "eller", "elles", "en", "enn", "er", "et", "ett", "etter", "for", "fordi",
  "fra", "før", "ha", "hadde", "han", "hans", "har", "hennar", "henne",
  "hennes", "her", "hjå", "ho", "hoe", "honom", "hoss", "hossen", "hun", "hva",
  "hvem", "hver", "hvilke", "hvilken", "hvis", "hvor", "hvordan", "hvorfor",
  "i", "ikke", "ikkje", "ingen", "ingi", "inkje", "inn", "inni", "ja", "jeg",
  "kan", "kom", "korleis", "korso", "kun", "kunne", "kva", "kvar", "kvarhelst",
  "kven", "kvi", "kvifor", "man", "mange", "me", "med", "medan", "meg",
  "mellom", "men", "mi", "min", "mine", "mitt", "mot", "mykje", "ned", "no",
  "noe", "noen", "nokon", "noko", "nokre", "nå", "når", "og", "også", "om",
  "opp", "oss", "over", "på", "same", "seg", "selv", "si", "sia", "sidan",
  "siden", "sin", "sine", "sitt", "sjøl", "skal", "skulle", "slik", "so",
  "som", "somme", "somt", "så", "til", "um", "under", "upp", "ut", "uten",
  "var", "vart", "varte", "ved", "vere", "veri", "verte", "vi", "vil", "ville",
  "vore", "vors", "vort", "vår", "være", "vært", "å"
] as const);

export const STOPWORDS_CHINESE = Object.freeze([
  "的", "了", "和", "是", "就", "都", "而", "及", "与", "着", "或", "一个",
  "没有", "我们", "你们", "他们", "她们", "它们", "这个", "那个", "不是",
  "可以", "什么", "这样", "那样", "怎么", "怎样", "如何", "这些", "那些",
  "可能", "因为", "所以", "但是", "不过", "然而", "虽然", "如果", "无论",
  "不管", "只要", "只有", "除了", "以外", "另外", "其他", "一些", "这么",
  "那么", "已经", "正在", "将要", "之前", "之后", "以后", "以前", "现在"
] as const);

export const STOPWORDS_TURKISH = Object.freeze([
  "acaba", "ama", "aslında", "az", "bazı", "belki", "benden", "beni", "benim",
  "beri", "bile", "bir", "biri", "birkaç", "birşey", "biz", "bize", "bizden",
  "bizi", "bizim", "bu", "buna", "bunda", "bundan", "bunlar", "bunları",
  "bunların", "bunu", "bunun", "burada", "çok", "çünkü", "da", "daha", "dahi",
  "de", "defa", "değil", "diğer", "diye", "dolayı", "dolayısıyla", "en", "gibi",
  "hem", "hep", "hepsi", "her", "herhangi", "herkes", "herkesi", "herkeze",
  "hiç", "hiçbir", "için", "ile", "ilgili", "ise", "işte", "kadar", "karşı",
  "kendi", "kendine", "kendini", "ki", "kim", "kime", "kimi", "kimin", "kimse",
  "madem", "mı", "mi", "mu", "mü", "nasıl", "ne", "neden", "nereye", "nerede",
  "nereye", "nesi", "neyse", "niçin", "niye", "o", "olan", "olmak", "olması",
  "olmaz", "olsa", "olsun", "olup", "olur", "oluyor", "on", "ona", "ondan",
  "onlar", "onlara", "onlardan", "onları", "onların", "onu", "onun", "orada",
  "öyle", "pek", "rağmen", "sadece", "sanki", "şayet", "şey", "şeyden",
  "şeyi", "şeyler", "şimdi", "şöyle", "şu", "şuna", "şundan", "şunu", "tabi",
  "tamam", "tüm", "tümü", "üzere", "var", "vardı", "ve", "veya", "ya", "yani",
  "yapacak", "yapıyor", "yapmak", "yaptı", "yine", "yoksa", "zaten", "zira"
] as const);

export type StopwordsLanguage =
  | "en"
  | "en_plus"
  | "de"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "nl"
  | "ru"
  | "sv"
  | "no"
  | "zh"
  | "tr";

export const STOPWORDS_MAP: Record<StopwordsLanguage | string, readonly string[]> = {
  en: STOPWORDS_EN,
  english: STOPWORDS_EN,
  en_plus: STOPWORDS_EN_PLUS,
  english_plus: STOPWORDS_EN_PLUS,
  de: STOPWORDS_GERMAN,
  german: STOPWORDS_GERMAN,
  fr: STOPWORDS_FRENCH,
  french: STOPWORDS_FRENCH,
  es: STOPWORDS_SPANISH,
  spanish: STOPWORDS_SPANISH,
  pt: STOPWORDS_PORTUGUESE,
  portuguese: STOPWORDS_PORTUGUESE,
  it: STOPWORDS_ITALIAN,
  italian: STOPWORDS_ITALIAN,
  nl: STOPWORDS_DUTCH,
  dutch: STOPWORDS_DUTCH,
  ru: STOPWORDS_RUSSIAN,
  russian: STOPWORDS_RUSSIAN,
  sv: STOPWORDS_SWEDISH,
  swedish: STOPWORDS_SWEDISH,
  no: STOPWORDS_NORWEGIAN,
  norwegian: STOPWORDS_NORWEGIAN,
  zh: STOPWORDS_CHINESE,
  chinese: STOPWORDS_CHINESE,
  tr: STOPWORDS_TURKISH,
  turkish: STOPWORDS_TURKISH,
};

/**
 * Get stopwords for a given language
 */
export function getStopwords(
  language: StopwordsLanguage | string | string[] | null | false
): Set<string> {
  if (language === null || language === false) {
    return new Set();
  }

  if (Array.isArray(language)) {
    return new Set(language);
  }

  const stopwords = STOPWORDS_MAP[language.toLowerCase()];
  if (!stopwords) {
    throw new Error(
      `Unknown stopwords language: ${language}. Available: ${Object.keys(STOPWORDS_MAP).join(", ")}`
    );
  }

  return new Set(stopwords);
}
