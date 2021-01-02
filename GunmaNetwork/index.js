"use strict";

const { featureCollection, feature, point } = require("@turf/helpers");
const fs = require("fs-extra");
const csvSync = require('csv-parse/lib/sync');
const ExifImage = require('exif').ExifImage;

//references
const references_csv = [
  ["館林市教育委員会・市立図書館編","館林双書　第十九巻",1991],
  ["館林市史編さん委員会編","館林市史特別編第4巻","館林城と中近世の遺跡",2010],
  ["館林石仏調査研究会編","文化財総合調査 館林市の石造文化財 館林・郷谷の石仏",1979],
  ["館林地方史研究会編","文化財総合調査 館林市の石造文化財 六郷・三野谷の石仏",1976],
  ["館林石仏調査研究会編","文化財総合調査 館林市の石造文化財 多々良・渡瀬の石仏",1978],
  ["落合敏男・小林一吉編","大島田谷千塚の石仏等の文化財",1972],
  ["館林地方史研究会編","たてばやしの野仏めぐり（その二） 赤生田、羽附の石仏",1973],
  ["館林市誌編集委員会編","館林市誌 歴史編",1969]
];

const areas = {
  "館林": [[2,193],[224,325],[1801,1803]],
  "郷谷": [[194,223],[326,475]],
  "大島": [[476,609]],
  "赤羽": [[610,910]],
  "六郷": [[911,1154]],
  "三野谷": [[1155,1388]],
  "多々良": [[1389,1622]],
  "渡瀬": [[1623,1766],[1768,1796]],
  "不明": [[1767]],
  "明和町": [[1797]],
  "邑楽町": [[1798,1800]]
};

const suppress = ["経度_度","経度_分","経度_秒","緯度_度","緯度_分","緯度_秒"];
const change = {
  "﻿入力No.": "fid",
  "地区No.": "area_no",
  "名称": "name",
  "種別": "type",
  "年代": "era",
  "西暦": "year",
  "所在地①": "place_1",
  "所在地②": "place_2",
  "詳細": "detail",
  "備考": "note",
  "参考文献": "references",
  "調査日": "surveyed",
  "解説": "description",
  "写真": "photo",
  "広報": "public_relations",
  "緯度（世界）": "latitude",
  "経度（世界）": "longitude",
  "重複文献①": "duplicated_book_1",
  "重複文献②": "duplicated_book_2",
};

const conditions = [
  [/朝日町/,/地内/,/.*/,/館林/, [36.25333180524548, 139.5388791739953]],
  [/朝日町/,/.*/,/円教寺/,/館林/, [36.251603161116186, 139.53898152041577]],
  [/朝日町/,/.*/,/法高寺/,/館林/, [36.25209359452558, 139.5380843403844]],
  [/朝日町/,/.*/,/法輪寺/,/館林/, [36.25181680892393, 139.53666330765387]],
  [/朝日町/,/.*/,/夜明稲荷神社/,/館林/, [36.24962685057965, 139.53987121546965]],
  [/台宿町/,/.*/,/熊野神社/,/館林/, [36.25198488943774, 139.53595086698755]],
  [/台宿町/,/.*/,/五宝寺/,/館林/, [36.25480570000846, 139.53409312550565]],
  [/大街道一丁目/,/.*/,/会館構内/,/館林/, [36.2545652824083, 139.52519337836594]],
  [/大街道二丁目/,/.*/,/.*/,/館林/, [36.257958885230714, 139.52163225216026]],
  [/栄町/,/.*/,/覚応寺/,/館林/, [36.24910015367552, 139.52729351035364]],
  [/栄町/,/.*/,/白山神社/,/館林/, [36.248925719697084, 139.5245823588268]],
  [/代官町/,/.*/,/大川いく/,/館林/, [36.252719743902084, 139.53248973785762]],
  [/代官町/,/.*/,/長良神社/,/館林/, [36.25427710425095, 139.53183531117847]],
  [/西本町/,/.*/,/愛宕神社/,/館林/, [36.251759399450066, 139.5285737014855]],
  [/西本町/,/.*/,/応声寺/,/館林/, [36.25040712937071, 139.52749699283984]],
  [/西本町/,/.*/,/法泉寺/,/館林/, [36.25330959737213, 139.5294023336547]],
  [/本町一丁目/,/.*/,/琴平神社/,/館林/, [36.25040321476825, 139.5352510380504]],
  [/本町二丁目/,/.*/,/(後藤|三森)/,/館林/, [36.246511545200086, 139.53373535710617]],
  [/本町二丁目/,/.*/,/大道寺/,/館林/, [36.24662827416558, 139.53123919825472]],
  [/本町三丁目/,/.*/,/竹生島神社/,/館林/, [36.24516106487551, 139.53802143134357]],
  [/本町四丁目/,/.*/,/龍泉寺/,/館林/, [36.24211091765047, 139.53174325421185]],
  [/本町四丁目/,/.*/,"",/館林/, [36.2429657543311, 139.5337798975386]],
  [/仲町/,/.*/,/観性寺/,/館林/, [36.249782439062926, 139.528976460815]],
  [/仲町/,/.*/,/常光寺/,/館林/, [36.250106862596986, 139.5322272812436]],
  [/仲町/,/.*/,/千眼寺/,/館林/, [36.24920270925962, 139.53201268069893]],
  [/楠町/,/.*/,/善導寺/,/郷谷/, [36.243343937704246, 139.56783040653713]],
  [/大手町/,/鷹匠町/,/寺島/,/館林/, [36.246762274592136, 139.53823679268095]],
  [/大手町/,/.*/,/寺島/,/館林/, [36.24732007003171, 139.53885385235876]],
  [/尾曳町/,/.*/,/秋元別邸/,/館林/, [36.24358304732986, 139.54607404838342]],
  [/尾曳町/,/.*/,/尾曳(稲荷)?神社/,/館林/, [36.2449884054216, 139.54750266722624]],
  [/加法師町/,/.*/,/教王院/,/館林/, [36.25080287077809, 139.5463118762876]],
  [/城町/,/.*/,/市立(資料|図書)館/,/館林/, [36.24471691341662, 139.54073869783002]],
  [/城町/,/.*/,/小林/,/館林/, [36.246055484651706, 139.54132453261167]],
  [/城町/,/.*/,/三の丸/,/館林/, [36.245798269583396, 139.5413680916824]],
  [/城町/,/.*/,/つつじが岡第二公園/,/館林/, [36.24303370449626, 139.54512017117122]],
  [/館林(市|地区)$/,/.*/,/.*/,/館林/, [36.248362482290936, 139.53680319972563]],
  [/^(郷谷地区|不明)$/,/.*/,/.*/,/郷谷/, [36.25008149183381, 139.56093499843456]],
  [/田谷町/,/谷中/,/.*/,/郷谷/, [36.251755496886, 139.59278697204243]],
  [/田谷町/,/.*/,/稲荷神社/,/郷谷/, [36.25830987037401, 139.58267032360274]],
  [/田谷町/,/.*/,/観音堂/,/郷谷/, [36.257941396930235, 139.58088651181743]],
  [/田谷町/,/.*/,/田谷墓地/,/郷谷/, [36.25756796928642, 139.58093864437186]],
  [/田谷町/,/.*/,"",/郷谷/, [36.256592368609226, 139.58520223156887]],
  [/千塚町/,/.*/,/常栄寺/,/郷谷/, [36.26016226894424, 139.57211872435965]],
  [/千塚町/,/.*/,/判官塚/,/郷谷/, [36.2582551833463, 139.5698247909434]],
  [/千塚町/,/.*/,/千塚墓地/,/郷谷/, [36.258983962521405, 139.57324693589382]],
  [/千塚町/,/.*/,"",/郷谷/, [36.25716947681442, 139.57002881424833]],
  [/当郷町/,/.*/,/(荒川|飯塚|今成|判官塚|亀井|坂下|浜野|谷津|^$)/,/郷谷/, [36.25014531723928, 139.56114959225195]],
  [/当郷町/,/.*/,/新田集会所/,/郷谷/, [36.24953511078215, 139.56357817366063]],
  [/当郷町/,/.*/,/善長寺/,/郷谷/, [36.24606811469005, 139.55608163977226]],
  [/当郷町/,/.*/,/当郷本郷/,/郷谷/, [36.245653192968284, 139.56110992540667]],
  [/当郷町/,/.*/,/薬師堂/,/郷谷/, [36.24499557156841, 139.56174290455812]],
  [/当郷町/,/.*/,/松林寺/,/郷谷/, [36.2473663762085, 139.55547403399495]],
  [/細内町/,/.*/,/細内墓地/,/郷谷/, [36.25960502670366, 139.5604502660164]],
  [/四ツ谷町/,/.*/,/稲荷神社/,/郷谷/, [36.25067099139546, 139.5753953241331]],
  [/四ツ谷町/,/.*/,/宝寿院/,/郷谷/, [36.250145102269606, 139.5749719502779]],
  [/大島町/,/本郷/,/神村家/,/大島/, [36.2651286389155, 139.5841113168649]],
  [/大島町/,/本郷/,/大島文館裏/,/大島/, [36.26364036159883, 139.58254775988377]],
  [/大島町/,/本郷/,/本郷天満宮前/,/大島/, [36.26585173437192, 139.58348604571646]],
  [/大島町/,/岡里/,/(2-310|岡里堤防|小林安二郎|根本神社|^$)/,/大島/, [36.26369892108193, 139.5971700197762]],
  [/大島町/,/岡里/,/墓地/,/大島/, [36.26472741027524, 139.59612792254504]],
  [/大島町/,/岡里/,/元善定院/,/大島/, [36.265532234593216, 139.59706532460493]],
  [/大島町/,/岡里/,/元善定院/,/大島/, [36.265532234593216, 139.59706532460493]],
  [/大島町/,/観音/,/観音堂/,/大島/, [36.251831676351905, 139.60211844192838]],
  [/大島町/,/山王/,/(4228|小熊|堤防|高山家|山本義一|日限地蔵|^$)/,/大島/, [36.26283059244536, 139.5809376942949]],
  [/大島町/,/^(山王)*$/,/吉祥寺/,/大島/, [36.263774929538506, 139.58025333693485]],
  [/大島町/,/山王/,/地蔵堂/,/大島/, [36.26476895252394, 139.58024098397283]],
  [/大島町/,/上新田/,/釈迦堂/,/大島/, [36.264313030255806, 139.5925604467088]],
  [/大島町/,/寄居/,/十二社/,/大島/, [36.26157028698177, 139.5762887352417]],
  [/大島町/,/寄居/,/(4778|荒井|大出|三叉路|^$)/,/大島/, [36.260326396107466, 139.57600481298087]],
  [/大島町/,/^(寄居)*$/,/明善寺/,/大島/, [36.26005007505112, 139.57418722221473]],
  [/大島町/,/^(正儀内)*$/,/春昌寺/,/大島/, [36.263309226308444, 139.56640891983827]],
  [/大島町/,/^(正儀内)*$/,/新田墓地/,/大島/, [36.263652852026325, 139.56601298187425]],
  [/大島町/,/正儀内(新田)*/,/(大関|岩上|堤防|松本|^$)/,/大島/, [36.26282469914167, 139.56727518794372]],
  [/大島町/,"",/大島神社/,/大島/, [36.265187663238585, 139.58910180172322]],
  [/大島町/,"",/神明宮/,/大島/, [36.26399615152394, 139.5773569127551]],
  [/大島町/,"",/大日稲神社/,/大島/, [36.262057842918054, 139.56557826523007]],
  [/赤羽地区/,/.*/,/(赤羽小学校|赤羽村国民学校)/,/赤羽/, [36.23263303781612, 139.56128363300923]],
  [/赤羽地区/,/.*/,/(坂村|塩田|館林市|半田|松本|渡辺)/,/赤羽/, [36.23165158660748, 139.56242413751977]],
  [/赤羽地区/,/.*/,/下新田墓地/,/赤羽/, [36.224691470023615, 139.5778849038309]],
  [/赤生田町/,/.*/,/浅間神社/,/赤羽/, [36.22912767867605, 139.56650281834212]],
  [/赤生田町/,/中島/,/稲葉/,/赤羽/, [36.224360275464086, 139.56595492434792]],
  [/赤生田町/,/.*/,/塩田/,/赤羽/, [36.22780678439725, 139.5647881329381]],
  [/赤生田町/,/.*/,/下新田(東)*墓地/,/赤羽/, [36.224691470023615, 139.5778849038309]],
  [/赤生田町/,/.*/,/子ノ(権現|神神社)/,/赤羽/, [36.22986615322142, 139.55757517496738]],
  [/赤生田町/,/下新田/,/(弁天池|畑中)/,/赤羽/, [36.22505811707236, 139.5755690747805]],
  [/赤生田町/,/中島/,/恵下稲荷/,/赤羽/, [36.22559822899469, 139.5610157635037]],
  [/赤生田町/,/.*/,/(山神社|大山.神社)/,/赤羽/, [36.22924156582324, 139.56686876106315]],
  [/赤生田町/,/下新田/,/東墓地/,/赤羽/, [36.224691470023615, 139.5778849038309]],
  [/赤生田町/,/山田/,/^$/,/赤羽/, [36.22843046993781, 139.569030661063]],
  [/赤生田本町/,/.*/,/永明寺/,/赤羽/, [36.222527719955615, 139.55900613418197]],
  [/赤生田本町/,/.*/,"",/赤羽/, [36.22076225156748, 139.55601226872244]],
  [/上赤生田町/,/.*/,/観音堂/,/赤羽/, [36.22558754382934, 139.5458979040508]],
  [/上赤生田町/,/.*/,/阿弥陀堂/,/赤羽/, [36.22292426106405, 139.54843004087087]],
  [/上赤生田町/,/.*/,"",/赤羽/, [36.22737898310334, 139.54724384442864]],
  [/楠町/,/.*/,/(榎墓地|陣谷)/,/赤羽/, [36.24299285843281, 139.57190431876415]],
  [/楠町/,/.*/,/上新田三叉路/,/赤羽/, [36.234483244901774, 139.56484249669992]],
  [/楠町/,/.*/,/北山墓地/,/赤羽/, [36.23830027388308, 139.56610335042936]],
  [/楠町/,/.*/,/楠木神社/,/赤羽/, [36.238687987133524, 139.57089733516122]],
  [/楠町/,/上新田/,"",/赤羽/, [36.234483244901774, 139.56484249669992]],
  [/楠町/,/.*/,/他宗場/,/赤羽/, [36.23382953333695, 139.56445730261552]],
  [/楠町/,/他宗場/,/(墓地|^$)/,/赤羽/, [36.23382953333695, 139.56445730261552]],
  [/楠町/,/.*/,/長良神社/,/赤羽/, [36.23773236647925, 139.5657880986406]],
  [/花山町/,/.*/,/大袋/,/赤羽/, [36.2374785823146, 139.5508515606538]],
  [/花山町/,/.*/,/公民館前/,/赤羽/, [36.23708862752681, 139.55018737195914]],
  [/花山町/,/.*/,/富士嶽神社/,/赤羽/, [36.23542861451482, 139.56084581273018]],
  [/花山町/,/富士山/,"",/赤羽/, [36.23640822643658, 139.56101762309382]],
  [/花山町/,/,*/,/つつじが岡公園/,/赤羽/, [36.24242011050098, 139.55527100990798]],
  [/羽附旭町/,/渕ノ上/,/(113|^$|大杉)/,/赤羽/, [36.2225250469883, 139.57962540453042]],
  [/羽附旭町/,/.*/,/釈迦堂/,/赤羽/, [36.22394746796446, 139.5806975956645]],
  [/羽附旭町/,/.*/,/白旗/,/赤羽/, [36.236361978336795, 139.57351280726405]],
  [/羽附旭町/,/.*/,/長竹/,/赤羽/, [36.23071237547675, 139.5779973229405]],
  [/羽附旭町/,/.*/,/渕ノ上/,/赤羽/, [36.2225250469883, 139.57962540453042]],
  [/羽附旭町/,/長竹/,"",/赤羽/, [36.23071237547675, 139.5779973229405]],
  [/羽附旭町/,/白旗/,"",/赤羽/, [36.236361978336795, 139.57351280726405]],
  [/羽附旭町/,/新興/,/(小林|田部井|^$)/,/赤羽/, [36.233724576469626, 139.57025610471112]],
  [/羽附旭町/,/.*/,/堂屋敷/,/赤羽/, [36.23075347736304, 139.57741761301347]],
  [/羽附旭町/,/中宿/,/八幡神社/,/赤羽/, [36.23165537042139, 139.57232220146147]],
  [/羽附旭町/,/中宿/,/弁天様/,/赤羽/, [36.232318101338045, 139.57126201400973]],
  [/羽附町/,/町谷/,/(1264|^$)/,/赤羽/, [36.236964965098835, 139.56847279123556]],
  [/羽附町/,/.*/,/(小林|坂村|田部井|半田|松本|渡辺)/,/赤羽/, [36.232870468912004, 139.56159155557657]],
  [/羽附町/,/.*/,/集会所横/,/赤羽/, [36.232417383721966, 139.55524209529202]],
  [/羽附町/,/.*/,/白旗/,/赤羽/, [36.236361978336795, 139.57351280726405]],
  [/羽附町/,/.*/,/第五小学校/,/赤羽/, [36.23263303781612, 139.56128363300923]],
  [/羽附町/,/.*/,/長竹集会所/,/赤羽/, [36.23101396878945, 139.57497080039724]],
  [/羽附町/,/.*/,/普済寺/,/赤羽/, [36.23455002761622, 139.5494474761483]],
  [/羽附町/,/.*/,/宝秀寺/,/赤羽/, [36.229727437197845, 139.57153706472243]],
  [/羽附町/,/.*/,/八坂神社/,/赤羽/, [36.23058764888446, 139.56807477948408]],
  [/羽附町/,/下志柄/,"",/赤羽/, [36.237548301496126, 139.56557027231267]],
  [/羽附町/,/上新田/,"",/赤羽/, [36.234483244901774, 139.56484249669992]],
  [/羽附町/,/本宿/,"",/赤羽/, [36.23048058242649, 139.56772749929667]],
  [/青柳町/,/.*/,/(田口|鑓田|金子|諏訪神社)/,/六郷/, [36.2204745664874, 139.51893677546312]],
  [/青柳町/,/.*/,/龍積寺/,/六郷/, [36.22163561580694, 139.51720080758233]],
  [/青柳町/,/五反田/,"",/六郷/, [36.2204745664874, 139.51893677546312]],
  [/小桑原町/,/.*/,/(赤土公民館|焼却場|^$)/,/六郷/, [36.23430457367212, 139.52358928106105]],
  [/小桑原町/,/.*/,/密蔵寺/,/六郷/, [36.233824437359715, 139.5227551033244]],
  [/小桑原町/,/.*/,/富士嶽神社/,/六郷/, [36.238616644341754, 139.52034732971902]],
  [/新宿一丁目/,/8-11/,/.*/,/六郷/, [36.239443432701655, 139.52900609063187]],
  [/新宿町/,/.*/,/第六小学校/,/六郷/, [36.237454714802496, 139.52493796336856]],
  [/新宿町/,/.*/,/集会所構内/,/六郷/, [36.241277266908426, 139.53093354266022]],
  [/新宿町/,/.*/,/長良神社/,/六郷/, [36.238130576234376, 139.52846424854684]],
  [/苗木町/,/.*/,/苗木墓地/,/六郷/, [36.227566473397, 139.51187011721066]],
  [/近藤町/,/開拓/,"",/六郷/, [36.23949951342548, 139.4945251165749]],
  [/富士原町/,/.*/,/富士嶽神社/,/六郷/, [36.238616644341754, 139.52034732971902]],
  [/富士原町/,/.*/,/富士原墓地/,/六郷/, [36.237767661226755, 139.51601952251949]],
  [/堀工町/,/上堀工/,/157/,/六郷/, [36.22409761074964, 139.53101233029986]],
  [/堀工町/,/.*/,/上堀工墓地/,/六郷/, [36.22379494869002, 139.52841572567468]],
  [/堀工町/,/.*/,/三神社/,/六郷/, [36.22523299689763, 139.5368986874467]],
  [/堀工町/,/.*/,/下堀工墓地/,/六郷/, [36.228666958760805, 139.5406021862109]],
  [/堀工町/,/.*/,/(須永|中里|松本|野村|^$)/,/六郷/, [36.22621975096177, 139.53551340814818]],
  [/堀工町/,/.*/,/茂林寺/,/六郷/, [36.2244477930521, 139.53112221573045]],
  [/堀工町/,/中山東/,"",/六郷/, [36.22621975096177, 139.53551340814818]],
  [/つつじ町/,/.*/,/総合体育館/,/六郷/, [36.23886031276844, 139.5439884612866]],
  [/松原町/,/.*/,/松林寺/,/六郷/, [36.23796404941195, 139.54221874165373]],
  [/松原一丁目/,/.*/,/(交差点|瀬山 儀一|浜野)/,/六郷/, [36.24019393883643, 139.53950260948113]],
  [/松原一丁目/,/7-33/,/.*/,/六郷/, [36.23793686357449, 139.5411058241843]],
  [/松原一丁目/,/19-32/,/.*/,/六郷/, [36.241530767976364, 139.53972082604326]],
  [/松原一丁目/,/.*/,/瀬山康長/,/六郷/, [36.241530767976364, 139.53972082604326]],
  [/松原一丁目/,/.*/,/松原公民館/,/六郷/, [36.24241556657757, 139.53914947490267]],
  [/松原二丁目/,/.*/,/松原(墓地|霊園)/,/六郷/, [36.23810326865325, 139.54274916946312]],
  [/緑町一丁目/,/.*/,/トウムギ地蔵堂/,/六郷/, [36.24116093756547, 139.53304237068747]],
  [/緑町一丁目/,/.*/,/新宿薬師堂/,/六郷/, [36.23936272142919, 139.53181211186794]],
  [/緑町一丁目/,/.*/,/遍照寺/,/六郷/, [36.240825105461326, 139.53161023179018]],
  [/緑町一丁目/,/3-7/,/.*/,/六郷/, [36.24116093756547, 139.53304237068747]],
  [/六郷地区/,/.*/,/(赤土共同墓地|阿部|石川|金子|小林|正田農場|松島)/,/六郷/, [36.241926682134675, 139.51719235419884]],
  [/六郷地区/,/.*/,/館林中学校/,/六郷/, [36.255916873559926, 139.53306582649972]],
  [/六郷地区/,/.*/,/長良神社/,/六郷/, [36.238130576234376, 139.52846424854684]],
  [/六郷地区/,/.*/,/富士嶽神社/,/六郷/, [36.238616644341754, 139.52034732971902]],
  [/入ヶ谷町/,/.*/,/(入ヶ谷会館|堤防上|入ヶ谷天満宮)/,/三野谷/, [36.213285017855554, 139.5012891549121]],
  [/上三林町/,/(羽沼|大曽根|^$)/,/(川島|休泊堀|新堀|荒川|石川|岩瀬|江森|大塚|小曽根|金子|島野|須永|樽見|本郷|茂木|山野井|吉間)/,/三野谷/, [36.21907693333951, 139.48473360251637]],
  [/上三林町/,"","",/三野谷/, [36.21907693333951, 139.48473360251637]],
  [/上三林町/,/新田/,/(1408-1|^$)/,/三野谷/, [36.22273353663806, 139.48253741088416]],
  [/上三林町/,/本郷/,/(2114)/,/三野谷/, [36.22232827070944, 139.4945493003854]],
  [/上三林町/,/.*/,/(1734)/,/三野谷/, [36.22512340497431, 139.48234632852274]],
  [/上三林町/,/.*/,/(釈迦堂墓地|雷光寺)/,/三野谷/, [36.2214116248458, 139.48228805241214]],
  [/上三林町/,/.*/,/十九夜堂/,/三野谷/, [36.21904756034494, 139.4951353710378]],
  [/上三林町/,/.*/,/真観寺/,/三野谷/, [36.21881800427784, 139.4865612285256]],
  [/上三林町/,/.*/,/農協/,/三野谷/, [36.21907761558542, 139.48702372901874]],
  [/上三林町/,/.*/,/新田/,/三野谷/, [36.22273353663806, 139.48253741088416]],
  [/上三林町/,/.*/,/三野谷分館/,/三野谷/, [36.21826296073553, 139.48432581331244]],
  [/上三林町/,/.*/,/雷電神社/,/三野谷/, [36.2215939049742, 139.48200907080872]],
  [/下三林町/,/(下耕地|^$)/,/(790-3|下耕地)/,/三野谷/, [36.221425580031784, 139.50219688904744]],
  [/下三林町/,/(舟戸|^$)/,/(荻原|川島|小暮|渋沢|道祖神|三田|吉田|^$)/,/三野谷/, [36.222941195711684, 139.50520282079611]],
  [/下三林町/,/.*/,/釈迦堂/,/三野谷/, [36.222388844609924, 139.5040311611407]],
  [/下三林町/,/.*/,/長良神社/,/三野谷/, [36.220209860531014, 139.5030093421849]],
  [/下三林町/,/.*/,/近藤沼南縁辺/,/三野谷/, [36.22514416595596, 139.5027066006162]],
  [/入ケ谷町/,/.*/,/菅原神社/,/三野谷/, [36.214071304144035, 139.50284957079757]],
  [/野辺町/,/.*/,/950-1/,/三野谷/, [36.22055175197837, 139.46389234503258]],
  [/野辺町/,/.*/,/(坂本|松林堂|野辺旧道)/,/三野谷/, [36.21745648460931, 139.46950171431882]],
  [/野辺町/,/.*/,/龍福寺/,/三野谷/, [36.218949860145585, 139.47040529989488]],
  [/野辺町/,/.*/,/長良神社/,/三野谷/, [36.218422287545025, 139.46432349528365]],
  [/三野谷地区/,/.*/,/(川島|坂本|荻原|小暮)/,/三野谷/, [36.21973495580497, 139.48671781414177]],
  [/岡野町/,/.*/,/(馬洗場|川島)/,/多々良/, [36.262469100171174, 139.526888709935]],
  [/岡野町/,"","",/多々良/, [36.262469100171174, 139.526888709935]],
  [/岡野町/,/.*/,/岡野共同墓地/,/多々良/, [36.26392448854724, 139.52611515510526]],
  [/北成島町/,/.*/,/休泊(共同)?墓地/,/多々良/, [36.25490710852644, 139.50817848705137]],
  [/北成島町/,/.*/,/休泊墓域/,/多々良/, [36.25560944166358, 139.50698714536387]],
  [/北?成島町/,/.*/,/大了庵/,/多々良/, [36.25548448,139.50789767]],
  [/北成島町/,/.*/,/二ッ屋/,/多々良/, [36.25417627427195, 139.5151319894908]],
  [/木戸町/,/.*/,/516-1/,/多々良/, [36.27578485533608, 139.51433992563642]],
  [/木戸町/,/.*/,/(679-1|馬捨場|江中湖畔|縁切橋|木戸道|馬場火の見下|桜木)/,/多々良/, [36.277398107649766, 139.519081236169]],
  [/(多々良地区|木戸町)/,/.*/,/常楽寺/,/多々良/, [36.27792711423635, 139.5138629086462]],
  [/木戸町/,/.*/,/深諦寺/,/多々良/, [36.27981420923574, 139.51489467128167]],
  [/木戸町/,/.*/,/赤城神社/,/多々良/, [36.27676980018065, 139.5137037326823]],
  [/休泊大了庵入口/,/.*/,/.*/,/多々良/, [36.25548448,139.50789767]],
  [/高根町/,/.*/,/稲荷神社/,/多々良/, [36.26351238626743, 139.5207043246784]],
  [/(多々良地区|高根町)/,/.*/,/源清寺/,/多々良/, [36.26748536051777, 139.5209983421779]],
  [/(多々良地区|高根町)/,/.*/,/龍興寺/,/多々良/, [36.26373723925728, 139.51474842208782]],
  [/高根町/,/.*/,/(大山祇神社|山神宮)/,/多々良/, [36.26636698372356, 139.51669036787425]],
  [/高根町/,/.*/,/第八小学校/,/多々良/, [36.262894759931854, 139.5117633287774]],
  [/高根町/,/.*/,/神明神社/,/多々良/, [36.262013337373965, 139.5190065721946]],
  [/高根町/,/.*/,/山神宮/,/多々良/, [36.262013337373965, 139.5190065721946]],
  [/高根町/,/.*/,/(裏)/,/多々良/, [36.26505121963972, 139.5165603451832]],
  [/高根町/,/.*/,/保育園/,/多々良/, [36.264757499874165, 139.51330044121946]],
  [/高根町/,/.*/,/農協支所/,/多々良/, [36.26305754097083, 139.51305056700608]],
  [/多々良地区/,/.*/,/(飯塚|井汲|館林市|津布久|手嶋)/,/多々良/, [36.255800123784994, 139.50448141806098]],
  [/(多々良地区|日向町)/,/.*/,/日向共同墓地/,/多々良/, [36.276213491314415, 139.5048700691338]],
  [/松沼町/,/.*/,/公園内/,/多々良/, [36.252369858507706, 139.49894865975165]],
  [/成島町/,/.*/,/(1060|2133|赤土墓地|飯塚|観音堂|菊池|城山神社|渡辺)/,/多々良/, [36.24840480083313, 139.48972700427103]],
  [/成島町/,/.*/,/休泊墓地/,/多々良/, [36.25490710852644, 139.50817848705137]],
  [/成島町/,/.*/,/大谷神社/,/多々良/, [36.25013246033763, 139.51002493653695]],
  [/成島町/,/.*/,/白山神社/,/多々良/, [36.248806799064646, 139.52456642091974]],
  [/成島町/,/.*/,/小蓋/,/多々良/, [36.24774505791116,139.50556127275217]],
  [/成島町/,/小蓋/,/.*/,/多々良/, [36.24774505791116,139.50556127275217]],
  [/成島/,"","",/多々良/, [36.24840480083313, 139.48972700427103]],
  [/西高根町/,/.*/,/多々良農協/,/多々良/, [36.26305754097083, 139.51305056700608]],
  [/日向町/,/.*/,/(大規|己一|下)/,/多々良/, [36.26595739397451, 139.49955525405105]],
  [/日向町/,/台/,"",/多々良/, [36.26595739397451, 139.49955525405105]],
  [/日向町/,/新田/,/(多々良沼畔|沼尻)/,/多々良/, [36.26564760443203, 139.50135916850118]],
  [/日向町/,/新田/,/共同墓地/,/多々良/, [36.26672358677033, 139.50144538847462]],
  [/日向町/,/.*/,/日向新田共同墓地/,/多々良/, [36.26672358677033, 139.50144538847462]],
  [/日向町/,/新田/,/大日堂/,/多々良/, [36.265449970200905, 139.50214953603881]],
  [/日向町/,/.*/,/日向新田((大日尊|・)?集会|大日堂)/,/多々良/, [36.265449970200905, 139.50214953603881]],
  [/日向町/,/.*/,/長良神社/,/多々良/, [36.276170689170975, 139.50755897075362]],
  [/日向町/,/.*/,/義民地蔵堂/,/多々良/, [36.270727939192035, 139.49966606437522]],
  [/日向町/,/新宿/,"",/多々良/, [36.270727939192035, 139.49966606437522]],
  [/日向町/,/.*/,/宝生寺/,/多々良/, [36.27048026618799, 139.49949652505987]],
  [/日向町/,/.*/,/新宿986/,/多々良/, [36.27291341319257, 139.50042999102743]],
  [/日向町/,/.*/,/区民会館/,/多々良/, [36.275867970800014, 139.5075898260189]],
  [/足次町/,/.*/,/赤城神社/,/渡瀬/, [36.26958632742269, 139.53113783361772]],
  [/足次町/,/.*/,/薬師堂/,/渡瀬/, [36.26688168405218, 139.53219989467422]],
  [/足次町/,/.*/,/(金子|五箇)/,/渡瀬/, [36.26647631043882, 139.53696782002706]],
  [/足次町/,/.*/,/観音寺/,/渡瀬/, [36.26379325474674, 139.5348933291331]],
  [/足次町/,/.*/,/千日堂/,/渡瀬/, [36.26510987412383, 139.53356852411503]],
  [/岡野町/,/八方/,"",/渡瀬/, [36.26243452672635, 139.5266740816477]],
  [/岡野町/,/.*/,/長良神社/,/渡瀬/, [36.26190668457478, 139.52733504637533]],
  [/岡野町/,/.*/,/蠶影神社/,/渡瀬/, [36.264727371944076, 139.5256669966928]],
  [/岡野町/,/.*/,/共同墓地/,/渡瀬/, [36.263894589118244, 139.52612845270116]],
  [/上早川田町/,/.*/,/(堤外地墓地|共同墓地)/,/渡瀬/, [36.278721278563886, 139.53637624046777]],
  [/上早川田町/,/.*/,/(堤防下|植原|荒井)/,/渡瀬/, [36.27619425627025, 139.53565066858644]],
  [/(上|下)早川田町/,/.*/,/蓮葉院/,/渡瀬/, [36.27588039293439, 139.5339522961083]],
  [/上早川田町/,/.*/,/352-2/,/渡瀬/, [36.27705210375407, 139.53430037386568]],
  [/上早川田町/,/.*/,/雷(電|伝)神社/,/渡瀬/, [36.27948059604233, 139.53586547771786]],
  [/下早川田町/,/.*/,/雲(龍|竜)寺/,/渡瀬/, [36.278388609005695, 139.55272972901489]],
  [/下早川田町/,/.*/,/(中村|観音坂|堤防上)/,/渡瀬/, [36.2687611461003, 139.55100949475118]],
  [/下早川田町/,/道下/,/888/,/渡瀬/, [36.27163660651591, 139.54853866816637]],
  [/下早川田町/,/.*/,/神明(宮|神社)/,/渡瀬/, [36.273837325436894, 139.54442720244285]],
  [/下早川田町/,/.*/,/天王神社/,/渡瀬/, [36.271123913576126, 139.54992742706577]],
  [/大新田/,/.*/,/稲荷神社/,/渡瀬/, [36.26021894411145, 139.547974289416]],
  [/大新田/,/.*/,/薬師堂墓地/,/渡瀬/, [36.25950926180332, 139.54468547240725]],
  [/不明/,"","",/不明/, [36.24624614348363, 139.52799321361624]],
  [/傍示塚町/,/悪土舟中/,"",/渡瀬/, [36.27600948749526, 139.526828737848]],
  [/傍示塚町/,/.*/,/堤防下/,/渡瀬/, [36.27600948749526, 139.526828737848]],
  [/傍示塚町/,/.*/,/赤城神社/,/渡瀬/, [36.279636487795514, 139.52721303733023]],
  [/傍示塚町/,/.*/,/(傍示塚(共同)*|万日堂)墓地/,/渡瀬/, [36.28032949508219, 139.53074473216654]],
  [/傍示塚町/,/.*/,/薬師堂/,/渡瀬/, [36.28165267378752, 139.52833984763117]],
  [/傍示塚町/,/.*/,/会館/,/渡瀬/, [36.27887425665467, 139.5296633833262]],
  [/渡瀬地区/,/.*/,/(金子|館林市)/,/渡瀬/, [36.267738793635225, 139.5354273672936]],
  [/.*/,/.*/,/小新田集会所/,/渡瀬/, [36.267738793635225, 139.5354273672936]],
  [/明和村/,/.*/,/入ケ谷地蔵堂/,/明和町/, [36.213285017855554, 139.5012891549121]],
  [/邑楽町/,/鶉/,/新田桜土手/,/邑楽町/, [36.25486876055699, 139.48599537472785]],
  [/邑楽町/,/開拓/,/八幡宮/,/邑楽町/, [36.239298765616425, 139.49150276113622]],
  [/邑楽町/,/開拓/,/八幡宮/,/邑楽町/, [36.239298765616425, 139.49150276113622]]
];

async function run() {
  const books = references_csv.reduce((prev, curr, index, arr) => {
    prev.push(feature(null, {
      name: curr[1],
      editor: curr[0],
      publishedAt: curr[2],
      fid: index + 1
    }));
    return index !== arr.length -  1 ? prev : featureCollection(prev, {});
  }, []);
  books.name = "books";

  fs.writeFileSync("books.geojson", JSON.stringify(books, null, 2), { encoding: "utf8", flag: "w" });

//data_csv1

  const content1 = fs.readFileSync("石仏・石碑等リスト.csv", { encoding: "utf8" });
  let lines1 = csvSync(content1);
  const attributes1 = lines1.shift().
      //filter(key => suppress.indexOf(key) < 0).
      map(key => change[key]).filter(key => key);
  lines1 = lines1.filter(line => line[0].match(/^\d+$/));

  const pois1pack = lines1.reduce((prev, curr, index, arr) => {
    const prev_pois = prev[0];
    const prev_refs = prev[1];
    let properties = attributes1.reduce((prev1, curr1, index1) => {
      const val = curr[index1].match(/^\d+$/) ?
          parseInt(curr[index1]) :
          curr[index1].match(/^[\d.]+\s*$/) ?
              parseFloat(curr[index1]):
              curr[index1];
      prev1[curr1] = val;
      return prev1;
    }, {});
    properties.area = Object.keys(areas).reduce((prev2, curr2, index2, arr2) => {
      if (prev2) return prev2;
      const bands = areas[curr2];
      return bands.reduce((prev3, curr3, index3, arr3) => {
        if (prev3) return prev3;
        return curr3.length === 1 ? index === curr3[0] - 2 : (index >= curr3[0] - 2 && index <= curr3[1] - 2);
      }, false) ? curr2 : prev2;
    }, null);
    properties = addLocation(properties);

    //refs
    properties.references.split("").map((ref) => {
      const idx_ref = prev_refs.length;
      const ref_id = ref.charCodeAt(0) - 9311;
      prev_refs.push(feature(null, {
        fid: idx_ref + 1,
        book: ref_id,
        poi: properties.fid,
        pages: "",
        description: "",
        note: ""
      }));
    });
    delete properties.references;

    const lnglat = [properties.longitude, properties.latitude];
    delete properties.longitude;
    delete properties.latitude;

    prev_pois.push(point(lnglat, properties));
    return index !== arr.length -  1 ? prev : [featureCollection(prev_pois, {}), featureCollection(prev_refs, {})];
  }, [[],[]]);
  const pois1 = pois1pack[0];
  const refs1 = pois1pack[1];
  pois1.name = "pois";
  refs1.name = "refs";

  fs.writeFileSync("pois.geojson", JSON.stringify(pois1, null, 2), { encoding: "utf8", flag: "w" });
  fs.writeFileSync("refs.geojson", JSON.stringify(refs1, null, 2), { encoding: "utf8", flag: "w" });

//images

  const images = await fs.readdirSync('.').filter(fname => fname.match(/JPG$/i)).reduce(async (prev_pr, curr, index, arr) => {
    const prev = await prev_pr;
    const poi_id = parseInt(curr.match(/^no(\d+)[^\d]/)[1]);
    const from = `./${curr}`;
    const to = `./images/${curr}`;
    fs.copySync(from, to);
    const shootingDate = await new Promise(res => {
      new ExifImage({ image : from }, function (error, exifData) {
        res(exifData.exif.CreateDate);
      });
    });

    prev.push(feature(null, {
      poi: poi_id,
      path: to,
      shootingDate,
      shooter: "Keisuke Miyata",
      description: "",
      note: ""
    }));
    return index !== arr.length -  1 ? prev : featureCollection(prev, {});
  }, []);

  fs.writeFileSync("images.geojson", JSON.stringify(images, null, 2), { encoding: "utf8", flag: "w" });
}

function addLocation(line) {
  if (line.latitude && line.longitude) {
    line.confirmed = true;
  } else {
    line.confirmed = false;
    const latlng = conditions.reduce((prev, curr) => {
      if (prev) return prev;
      return line.place_1.match(curr[0]) &&
        line.place_2.match(curr[1]) &&
        `${line.detail}`.match(curr[2]) &&
        line.area.match(curr[3]) ?
          curr[4] : prev;
    }, null);
    if (!latlng) throw `name: ${line.name} place_1: ${line.place_1} place_2: ${line.place_2} detail: ${line.detail} area: ${line.area}`;
    line.longitude = latlng[1] + (Math.random() - 0.5) / 3600;
    line.latitude = latlng[0] + (Math.random() - 0.5) / 3600;
  }
  return line;
}

run();

