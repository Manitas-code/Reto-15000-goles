
/* ===== FutcaGames · estadios de fondo ===== */
(function(){
var TEAMS=[{"id": "Alaves", "name": "Alavés", "stadium": "Mendizorroza", "league": "LL", "color": "#1f55b0", "spec": {"open": true, "towers": true, "led": "#ffffff", "far": {"maxD": 16, "slope": 0.55, "roof": "none", "tiers": [[3, 16, "#1f55b0", "#ffffff", "#ffffff"]]}, "side": {"maxD": 26, "slope": 0.65, "roof": "canopy", "roofCol": "#e6e8ec", "ribs": "#b9bec6", "ov": 10, "tiers": [[3, 13, "#1f55b0", "#ffffff", "#ffffff", "#ffffff", 2], [15, 26, "#1f55b0", "#ffffff", "#9fc0ff"]]}}}, {"id": "Athletic", "name": "Athletic", "stadium": "San Mamés", "league": "LL", "color": "#c8102e", "spec": {"maxD": 50, "slope": 0.8, "oval": 4, "roof": "arch", "roofCol": "#f3f2ee", "ov": 22, "led": "#ff3b3b", "tiers": [[3, 18, "#c8102e", "#ffffff", "#ffd0d0"], [21, 34, "#c8102e", "#ffffff", "#ffffff"], [37, 50, "#b30d27", "#ffffff", "#ffffff"]]}}, {"id": "Atletico", "name": "Atlético", "stadium": "Metropolitano", "league": "LL", "color": "#cb3524", "spec": {"maxD": 58, "slope": 0.72, "oval": 20, "roof": "wave", "roofCol": "#e9edf1", "ribs": "#b7bec8", "ribbon": true, "noBoard": true, "ov": 30, "led": "#e8453a", "tiers": [[3, 24, "#cb3524", "#ffffff", "#1c2c5b"], [28, 58, "#cb3524", "#ffffff", "#ffffff"]]}}, {"id": "Barcelona", "name": "Barcelona", "stadium": "Camp Nou", "league": "LL", "color": "#a50044", "spec": {"maxD": 76, "slope": 0.62, "oval": 36, "roof": "canopy", "roofCol": "#eef0f3", "ribs": "#b9bfc8", "ov": 44, "lift": 16, "led": "#f2c14e", "tiers": [[3, 24, "#a50044", "#004d98", "#ffffff", "#004d98", 3], [27, 48, "#004d98", "#a50044", "#ffffff", "#a50044", 3], [51, 76, "#a50044", "#004d98", "#ffffff", "#004d98", 3]]}}, {"id": "Betis", "name": "Betis", "stadium": "Benito Villamarín", "league": "LL", "color": "#0a9c55", "spec": {"maxD": 55, "slope": 0.75, "oval": 6, "roof": "canopy", "roofSide": ["left", "right"], "roofCol": "#dfe3e0", "ribs": "#aab3ad", "ov": 16, "led": "#18c46b", "tiers": [[3, 22, "#0a9c55", "#ffffff", "#ffffff", "#ffffff", 1], [26, 40, "#0a9c55", "#ffffff", "#d6f5e3"], [43, 55, "#0a9c55", "#ffffff", "#ffffff"]]}}, {"id": "Celta", "name": "Celta", "stadium": "Balaídos", "league": "LL", "color": "#7fbde8", "spec": {"open": true, "led": "#8ac3ee", "far": {"maxD": 24, "slope": 0.66, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 10, "tiers": [[3, 24, "#7fbde8", "#ffffff", "#10324f"]]}, "side": {"maxD": 32, "slope": 0.7, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 14, "tiers": [[3, 15, "#7fbde8", "#ffffff", "#10324f"], [17, 32, "#7fbde8", "#10324f", "#ffffff"]]}}}, {"id": "Deportivo", "name": "Deportivo", "stadium": "Riazor", "league": "LL", "color": "#1e4fa3", "spec": {"maxD": 36, "slope": 0.68, "oval": 14, "roof": "canopy", "roofCol": "#e6e8ec", "ribs": "#b3b9c2", "ov": 12, "led": "#3d7bff", "tiers": [[3, 16, "#1e4fa3", "#ffffff", "#ffffff", "#ffffff", 1], [19, 36, "#ffffff", "#1e4fa3", "#1e4fa3"]]}}, {"id": "Elche", "name": "Elche", "stadium": "Martínez Valero", "league": "LL", "color": "#0a7a3e", "spec": {"maxD": 40, "slope": 0.6, "oval": 30, "roof": "canopy", "roofSide": "right", "roofCol": "#343a46", "ov": 12, "towers": true, "led": "#18c46b", "tiers": [[3, 18, "#0a7a3e", "#ffffff", "#ffffff"], [21, 40, "#ffffff", "#0a7a3e", "#0a7a3e"]]}}, {"id": "Espanyol", "name": "Espanyol", "stadium": "Cornellà-El Prat", "league": "LL", "color": "#0a6fc0", "spec": {"maxD": 38, "slope": 0.72, "oval": 10, "chamfer": true, "roof": "canopy", "roofSide": ["far", "left", "right"], "lift": 6, "beams": true, "cornerScreens": true, "noBoard": true, "roofCol": "#2b3446", "ribs": "#46526a", "ov": 18, "led": "#1e90ff", "tiers": [[3, 16, "#0a6fc0", "#ffffff", "#ffffff"], [20, 38, "#0a6fc0", "#ffffff", "#9fc6ff"]]}}, {"id": "Getafe", "name": "Getafe", "stadium": "Coliseum", "league": "LL", "color": "#005999", "spec": {"open": true, "towers": true, "led": "#3d7bff", "far": {"maxD": 16, "slope": 0.6, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 16, "#005999", "#ffffff", "#9fc0ff"]]}, "side": {"maxD": 22, "slope": 0.65, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 22, "#005999", "#ffffff", "#9fc0ff"]]}}}, {"id": "Levante", "name": "Levante", "stadium": "Ciutat de València", "league": "LL", "color": "#004b9b", "spec": {"open": true, "towers": true, "led": "#b4053f", "far": {"maxD": 18, "slope": 0.6, "roof": "none", "tiers": [[3, 18, "#004b9b", "#ffffff", "#b4053f"]]}, "side": {"maxD": 20, "slope": 0.6, "roof": "none", "tiers": [[3, 20, "#b4053f", "#ffffff", "#004b9b", "#004b9b", 2]]}, "sideR": {"maxD": 28, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 12, "tiers": [[3, 14, "#b4053f", "#ffffff", "#004b9b", "#004b9b", 2], [16, 28, "#004b9b", "#ffffff", "#b4053f"]]}}}, {"id": "Malaga", "name": "Málaga", "stadium": "La Rosaleda", "league": "LL", "color": "#0078c1", "spec": {"maxD": 36, "slope": 0.64, "oval": 24, "roof": "canopy", "roofSide": "right", "roofCol": "#e6e8ec", "ribs": "#b3b9c2", "ov": 12, "towers": true, "led": "#3d9bff", "tiers": [[3, 17, "#0078c1", "#ffffff", "#ffffff", "#5aa9e0", 2], [20, 36, "#5aa9e0", "#ffffff", "#0078c1"]]}}, {"id": "Osasuna", "name": "Osasuna", "stadium": "El Sadar", "league": "LL", "color": "#b5161c", "spec": {"maxD": 34, "slope": 1.05, "oval": 6, "roof": "canopy", "roofCol": "#15171c", "ribs": "#2c3038", "ov": 20, "sepCol": "#ffcf7a", "led": "#ff3b3b", "tiers": [[3, 12, "#b5161c", "#ffffff", "#0a1f44"], [14, 23, "#b5161c", "#ffffff", "#ffffff"], [25, 34, "#b5161c", "#ffffff", "#0a1f44"]]}}, {"id": "Racing", "name": "Racing", "stadium": "El Sardinero", "league": "LL", "color": "#00843d", "spec": {"open": true, "towers": true, "led": "#18c46b", "far": {"maxD": 20, "slope": 0.6, "roof": "none", "tiers": [[3, 20, "#00843d", "#ffffff", "#ffffff", "#ffffff", 1]]}, "side": {"maxD": 28, "slope": 0.66, "roof": "canopy", "roofCol": "#e6e8ec", "ov": 10, "tiers": [[3, 13, "#00843d", "#ffffff", "#ffffff", "#ffffff", 2], [15, 28, "#ffffff", "#00843d", "#00843d"]]}}}, {"id": "Rayo", "name": "Rayo Vallecano", "stadium": "Vallecas", "league": "LL", "color": "#ffffff", "spec": {"maxD": 22, "slope": 0.7, "oval": 0, "roof": "open", "towers": true, "noFar": true, "led": "#e53027", "tiers": [[3, 22, "#ffffff", "#e53027", "#2a2f3a"]]}}, {"id": "Madrid", "name": "Real Madrid", "stadium": "Bernabéu", "league": "LL", "color": "#5a3f99", "spec": {"maxD": 70, "slope": 0.72, "oval": 0, "roof": "lattice", "led": "#3d7bff", "tiers": [[3, 26, "#5a3f99", "#f4f1ea", "#c9a94b"], [29, 45, "#ecebf2", "#2d2744", "#8b79c9"], [47, 70, "#34295a", "#f4f1ea", "#f4f1ea"]]}}, {"id": "RealSociedad", "name": "Real Sociedad", "stadium": "Anoeta", "league": "LL", "color": "#0067b1", "spec": {"maxD": 40, "slope": 0.8, "oval": 8, "roof": "canopy", "roofCol": "#e9ecef", "ribs": "#9aa3ad", "ov": 18, "led": "#3d7bff", "tiers": [[3, 40, "#0067b1", "#ffffff", "#ffffff", "#ffffff", 1]]}}, {"id": "Sevilla", "name": "Sevilla", "stadium": "Sánchez-Pizjuán", "league": "LL", "color": "#d71920", "spec": {"maxD": 46, "slope": 0.85, "oval": 12, "roof": "canopy", "roofSide": "left", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "rim": true, "sepCol": "#bfe3ff", "ov": 14, "led": "#ff3b3b", "tiers": [[3, 20, "#d71920", "#ffffff", "#ffffff"], [23, 46, "#d71920", "#ffffff", "#ffffff"]]}}, {"id": "Valencia", "name": "Valencia", "stadium": "Mestalla", "league": "LL", "color": "#ee7f00", "spec": {"maxD": 44, "slope": 1.12, "oval": 3, "roof": "canopy", "roofSide": "left", "roofCol": "#343a46", "ov": 14, "rim": true, "led": "#ee7f00", "extraR": {"maxD": 54, "slope": 1.12, "roof": "none", "rim": true, "tiers": [[46, 54, "#ee7f00", "#ffffff", "#1e1e1e", "#ffffff", 2, "#2a2a2a"]]}, "tiers": [[3, 14, "#ee7f00", "#ffffff", "#1e1e1e"], [17, 30, "#f4f1ea", "#ee7f00", "#1e1e1e"], [33, 44, "#ee7f00", "#ffffff", "#1e1e1e", "#f4f1ea", 2, "#2a2a2a"]]}}, {"id": "Villarreal", "name": "Villarreal", "stadium": "La Cerámica", "league": "LL", "color": "#ffd400", "spec": {"maxD": 24, "slope": 0.78, "oval": 2, "chamfer": true, "roof": "canopy", "roofCol": "#e8b400", "ribs": "#c99a00", "ov": 13, "cornerScreens": true, "noBoard": true, "led": "#ffd400", "tiers": [[3, 12, "#ffd400", "#005187", "#2a2f3a"], [14, 24, "#ffd400", "#005187", "#2a2f3a", "#f5c400", 2]]}}, {"id": "PL-Arsenal", "name": "Arsenal", "stadium": "Emirates", "league": "PL", "color": "#e0111d", "spec": {"maxD": 62, "slope": 0.66, "oval": 30, "roof": "canopy", "roofCol": "#e9ecef", "ribs": "#b4bac2", "ov": 26, "lift": 4, "sepCol": "#ffd6a0", "led": "#ff2d2d", "tiers": [[3, 20, "#e0111d", "#ffffff", "#ffffff"], [24, 32, "#1c1f26", "#ffd6a0", "#ffd6a0"], [35, 62, "#e0111d", "#ffffff", "#ffffff"]]}}, {"id": "PL-AstonVilla", "name": "Aston Villa", "stadium": "Villa Park", "league": "PL", "color": "#7a1f3d", "spec": {"open": true, "towers": false, "led": "#8fb8ff", "far": {"maxD": 34, "slope": 0.8, "roof": "canopy", "roofCol": "#343a46", "ov": 12, "tiers": [[3, 17, "#7a1f3d", "#8fb8ff", "#ffffff"], [20, 34, "#7a1f3d", "#8fb8ff", "#ffffff"]]}, "side": {"maxD": 26, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 13, "#7a1f3d", "#8fb8ff", "#ffffff"], [15, 26, "#7a1f3d", "#8fb8ff", "#8fb8ff"]]}, "sideR": {"maxD": 28, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 14, "#7a1f3d", "#8fb8ff", "#ffffff"], [16, 28, "#7a1f3d", "#ffffff", "#8fb8ff"]]}}}, {"id": "PL-Bournemouth", "name": "Bournemouth", "stadium": "Vitality Stadium", "league": "PL", "color": "#e62333", "spec": {"open": true, "towers": true, "led": "#e62333", "far": {"maxD": 9, "slope": 0.55, "roof": "none", "tiers": [[3, 9, "#e62333", "#111111", "#ffffff"]]}, "side": {"maxD": 16, "slope": 0.6, "roof": "canopy", "roofCol": "#5a616e", "ov": 7, "tiers": [[3, 16, "#e62333", "#111111", "#ffffff"]]}, "sideR": {"maxD": 16, "slope": 0.6, "roof": "canopy", "roofCol": "#5a616e", "ov": 7, "tiers": [[3, 16, "#e62333", "#111111", "#ffffff"]]}}}, {"id": "PL-Brentford", "name": "Brentford", "stadium": "Gtech Community Stadium", "league": "PL", "color": "#e30613", "spec": {"open": true, "closed": true, "led": "#e30613", "corn": {"maxD": 18, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 18, "#e30613", "#ffffff", "#f2c14e"]]}, "far": {"maxD": 18, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 18, "#e30613", "#ffffff", "#f2c14e"]]}, "side": {"maxD": 28, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 11, "tiers": [[3, 13, "#e30613", "#ffffff", "#f2c14e"], [15, 28, "#e30613", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 18, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 18, "#e30613", "#ffffff", "#f2c14e"]]}}}, {"id": "PL-Brighton", "name": "Brighton", "stadium": "Amex Stadium", "league": "PL", "color": "#0057b8", "spec": {"open": true, "closed": true, "led": "#0057b8", "corn": {"maxD": 22, "slope": 0.62, "roof": "canopy", "roofCol": "#f2f3f5", "ov": 9, "tiers": [[3, 22, "#0057b8", "#ffffff", "#ffffff"]]}, "far": {"maxD": 22, "slope": 0.62, "roof": "canopy", "roofCol": "#f2f3f5", "ribs": "#c4c9d0", "ov": 9, "tiers": [[3, 22, "#0057b8", "#ffffff", "#ffffff"]]}, "side": {"maxD": 22, "slope": 0.62, "roof": "canopy", "roofCol": "#f2f3f5", "ribs": "#c4c9d0", "ov": 9, "tiers": [[3, 22, "#0057b8", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 44, "slope": 0.72, "roof": "canopy", "roofCol": "#f2f3f5", "ribs": "#c4c9d0", "ov": 17, "tiers": [[3, 16, "#0057b8", "#ffffff", "#ffffff"], [19, 30, "#0057b8", "#ffffff", "#ffffff"], [33, 44, "#0057b8", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Chelsea", "name": "Chelsea", "stadium": "Stamford Bridge", "league": "PL", "color": "#034694", "spec": {"open": true, "closed": true, "led": "#034694", "corn": {"maxD": 30, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ov": 12, "tiers": [[3, 14, "#034694", "#ffffff", "#ffffff"], [17, 30, "#034694", "#ffffff", "#ffffff"]]}, "far": {"maxD": 34, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ov": 13, "tiers": [[3, 16, "#034694", "#ffffff", "#ffffff"], [19, 34, "#034694", "#ffffff", "#ffffff"]]}, "side": {"maxD": 46, "slope": 0.78, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 18, "tiers": [[3, 16, "#034694", "#ffffff", "#ffffff"], [19, 30, "#034694", "#ffffff", "#ffffff"], [33, 46, "#034694", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 40, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 16, "tiers": [[3, 15, "#034694", "#ffffff", "#ffffff"], [18, 28, "#034694", "#ffffff", "#ffffff"], [31, 40, "#034694", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Coventry", "name": "Coventry", "stadium": "CBS Arena", "league": "PL", "color": "#5fb4ff", "spec": {"open": true, "closed": true, "led": "#5fb4ff", "corn": {"maxD": 28, "slope": 0.7, "roof": "canopy", "roofCol": "#dfe3e8", "ov": 11, "tiers": [[3, 28, "#5fb4ff", "#ffffff", "#1e3a6e", "#ffffff", 2]]}, "far": {"maxD": 28, "slope": 0.7, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 11, "tiers": [[3, 28, "#5fb4ff", "#ffffff", "#1e3a6e", "#ffffff", 2]]}, "side": {"maxD": 34, "slope": 0.7, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 13, "tiers": [[3, 20, "#5fb4ff", "#ffffff", "#1e3a6e", "#ffffff", 2], [23, 34, "#5fb4ff", "#ffffff", "#ffffff"]]}}}, {"id": "PL-CrystalPalace", "name": "Crystal Palace", "stadium": "Selhurst Park", "league": "PL", "color": "#c4122e", "spec": {"open": true, "towers": true, "led": "#c4122e", "far": {"maxD": 30, "slope": 0.78, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 15, "#c4122e", "#1b458f", "#ffffff"], [17, 30, "#1b458f", "#c4122e", "#ffffff"]]}, "side": {"maxD": 12, "slope": 0.55, "roof": "canopy", "roofCol": "#343a46", "ov": 6, "tiers": [[3, 12, "#c4122e", "#1b458f", "#ffffff"]]}, "sideR": {"maxD": 18, "slope": 0.6, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 18, "#1b458f", "#c4122e", "#ffffff"]]}}}, {"id": "PL-Everton", "name": "Everton", "stadium": "Hill Dickinson Stadium", "league": "PL", "color": "#003399", "spec": {"open": true, "closed": true, "led": "#003399", "corn": {"maxD": 30, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ov": 12, "tiers": [[3, 14, "#003399", "#ffffff", "#ffffff"], [17, 30, "#003399", "#ffffff", "#9fc0ff"]]}, "far": {"maxD": 42, "slope": 0.95, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 16, "tiers": [[3, 42, "#003399", "#ffffff", "#ffffff", "#0a2a80", 3]]}, "side": {"maxD": 34, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 13, "tiers": [[3, 15, "#003399", "#ffffff", "#ffffff"], [18, 34, "#003399", "#ffffff", "#9fc0ff"]]}}}, {"id": "PL-Fulham", "name": "Fulham", "stadium": "Craven Cottage", "league": "PL", "color": "#ffffff", "spec": {"open": true, "towers": true, "led": "#ffffff", "corner": {"d": 14, "h": 12, "col": "#e8e0d0", "roof": "#7a4a2e"}, "far": {"maxD": 14, "slope": 0.6, "roof": "canopy", "roofCol": "#343a46", "ov": 6, "tiers": [[3, 14, "#ffffff", "#111111", "#111111"]]}, "side": {"maxD": 16, "slope": 0.6, "roof": "canopy", "roofCol": "#dfe3e8", "ov": 7, "tiers": [[3, 16, "#ffffff", "#111111", "#111111"]]}, "sideR": {"maxD": 24, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 11, "#ffffff", "#111111", "#111111"], [13, 24, "#ffffff", "#111111", "#111111"]]}}}, {"id": "PL-Hull", "name": "Hull City", "stadium": "MKM Stadium", "league": "PL", "color": "#f5a623", "spec": {"open": true, "closed": true, "led": "#f5a623", "corn": {"maxD": 18, "slope": 0.62, "roof": "canopy", "roofCol": "#dfe3e8", "ov": 8, "tiers": [[3, 18, "#f5a623", "#111111", "#ffffff"]]}, "far": {"maxD": 18, "slope": 0.62, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 8, "tiers": [[3, 18, "#f5a623", "#111111", "#ffffff"]]}, "side": {"maxD": 30, "slope": 0.68, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 10, "tiers": [[3, 18, "#f5a623", "#111111", "#ffffff"], [21, 30, "#f5a623", "#111111", "#ffffff"]]}, "sideR": {"maxD": 18, "slope": 0.62, "roof": "canopy", "roofCol": "#dfe3e8", "ov": 8, "tiers": [[3, 18, "#f5a623", "#111111", "#ffffff"]]}}}, {"id": "PL-Ipswich", "name": "Ipswich", "stadium": "Portman Road", "league": "PL", "color": "#3a64a8", "spec": {"open": true, "towers": true, "led": "#3a64a8", "far": {"maxD": 26, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 13, "#3a64a8", "#ffffff", "#ffffff"], [15, 26, "#3a64a8", "#ffffff", "#ffffff"]]}, "side": {"maxD": 14, "slope": 0.6, "roof": "canopy", "roofCol": "#343a46", "ov": 6, "tiers": [[3, 14, "#3a64a8", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 22, "slope": 0.66, "roof": "canopy", "roofCol": "#343a46", "ov": 9, "tiers": [[3, 11, "#3a64a8", "#ffffff", "#ffffff"], [13, 22, "#3a64a8", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Leeds", "name": "Leeds", "stadium": "Elland Road", "league": "PL", "color": "#1d428a", "spec": {"open": true, "towers": true, "led": "#ffcd00", "far": {"maxD": 18, "slope": 0.62, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 18, "#1d428a", "#ffffff", "#ffcd00"]]}, "side": {"maxD": 44, "slope": 0.8, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 18, "tiers": [[3, 20, "#1d428a", "#ffffff", "#ffcd00"], [23, 44, "#1d428a", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 18, "slope": 0.6, "roof": "canopy", "roofCol": "#343a46", "ov": 8, "tiers": [[3, 9, "#1d428a", "#ffffff", "#ffcd00"], [11, 18, "#1d428a", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Liverpool", "name": "Liverpool", "stadium": "Anfield", "league": "PL", "color": "#c8102e", "spec": {"open": true, "closed": true, "led": "#c8102e", "corn": {"maxD": 26, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 10, "tiers": [[3, 12, "#c8102e", "#ffffff", "#ffffff"], [14, 26, "#c8102e", "#ffffff", "#ffffff"]]}, "far": {"maxD": 42, "slope": 0.86, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 16, "tiers": [[3, 42, "#c8102e", "#ffffff", "#ffffff", "#b00d28", 3]]}, "side": {"maxD": 52, "slope": 0.8, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 20, "tiers": [[3, 16, "#c8102e", "#ffffff", "#ffffff"], [19, 32, "#c8102e", "#ffffff", "#ffffff"], [35, 52, "#c8102e", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 32, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ov": 12, "tiers": [[3, 14, "#c8102e", "#ffffff", "#ffffff"], [17, 32, "#c8102e", "#ffffff", "#ffffff"]]}}}, {"id": "PL-ManCity", "name": "Man. City", "stadium": "Etihad Stadium", "league": "PL", "color": "#6cabdd", "spec": {"open": true, "closed": true, "led": "#6cabdd", "corn": {"maxD": 36, "slope": 0.66, "roof": "canopy", "roofCol": "#eef0f3", "ov": 15, "lift": 6, "tiers": [[3, 18, "#6cabdd", "#ffffff", "#ffffff"], [21, 36, "#6cabdd", "#ffffff", "#1c2c5b"]]}, "far": {"maxD": 36, "slope": 0.66, "roof": "canopy", "roofCol": "#eef0f3", "ribs": "#b9bfc8", "ov": 15, "lift": 6, "tiers": [[3, 18, "#6cabdd", "#ffffff", "#ffffff"], [21, 36, "#6cabdd", "#ffffff", "#1c2c5b"]]}, "side": {"maxD": 54, "slope": 0.68, "roof": "canopy", "roofCol": "#eef0f3", "ribs": "#b9bfc8", "ov": 22, "lift": 6, "tiers": [[3, 20, "#6cabdd", "#ffffff", "#ffffff"], [23, 37, "#6cabdd", "#ffffff", "#1c2c5b"], [40, 54, "#6cabdd", "#ffffff", "#ffffff"]]}}}, {"id": "PL-ManUtd", "name": "Man. United", "stadium": "Old Trafford", "league": "PL", "color": "#da291c", "spec": {"open": true, "closed": true, "led": "#da291c", "corn": {"maxD": 40, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ov": 16, "tiers": [[3, 18, "#da291c", "#ffffff", "#ffffff"], [21, 40, "#da291c", "#ffffff", "#ffffff"]]}, "far": {"maxD": 42, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 16, "tiers": [[3, 18, "#da291c", "#ffffff", "#ffffff"], [21, 42, "#da291c", "#ffffff", "#ffffff"]]}, "side": {"maxD": 68, "slope": 0.76, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 26, "tiers": [[3, 20, "#da291c", "#ffffff", "#ffffff"], [23, 44, "#da291c", "#ffffff", "#ffffff"], [47, 68, "#da291c", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 44, "slope": 0.72, "roof": "canopy", "roofCol": "#343a46", "ribs": "#4a5262", "ov": 18, "tiers": [[3, 20, "#da291c", "#ffffff", "#ffffff"], [23, 44, "#da291c", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Newcastle", "name": "Newcastle", "stadium": "St James' Park", "league": "PL", "color": "#1c1c1c", "spec": {"open": true, "closed": true, "led": "#ffffff", "corn": {"maxD": 24, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 9, "tiers": [[3, 24, "#1c1c1c", "#ffffff", "#ffffff"]]}, "far": {"maxD": 24, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 9, "tiers": [[3, 24, "#1c1c1c", "#ffffff", "#ffffff"]]}, "side": {"maxD": 64, "slope": 0.9, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 26, "tiers": [[3, 22, "#1c1c1c", "#ffffff", "#ffffff"], [25, 40, "#1c1c1c", "#ffffff", "#ffffff"], [43, 64, "#1c1c1c", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 24, "slope": 0.7, "roof": "canopy", "roofCol": "#343a46", "ov": 9, "tiers": [[3, 24, "#1c1c1c", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Forest", "name": "Nottm Forest", "stadium": "City Ground", "league": "PL", "color": "#e53233", "spec": {"open": true, "towers": true, "led": "#e53233", "far": {"maxD": 16, "slope": 0.62, "roof": "canopy", "roofCol": "#343a46", "ov": 7, "tiers": [[3, 16, "#e53233", "#ffffff", "#ffffff"]]}, "side": {"maxD": 30, "slope": 0.74, "roof": "canopy", "roofCol": "#343a46", "ov": 12, "tiers": [[3, 14, "#e53233", "#ffffff", "#ffffff"], [16, 30, "#e53233", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 14, "slope": 0.6, "roof": "canopy", "roofCol": "#343a46", "ov": 6, "tiers": [[3, 14, "#e53233", "#ffffff", "#ffffff"]]}}}, {"id": "PL-Sunderland", "name": "Sunderland", "stadium": "Stadium of Light", "league": "PL", "color": "#eb172b", "spec": {"open": true, "closed": true, "led": "#eb172b", "corn": {"maxD": 26, "slope": 0.66, "roof": "canopy", "roofCol": "#dfe3e8", "ov": 10, "tiers": [[3, 26, "#eb172b", "#ffffff", "#ffffff", "#ffffff", 2]]}, "far": {"maxD": 26, "slope": 0.66, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 10, "tiers": [[3, 26, "#eb172b", "#ffffff", "#ffffff", "#ffffff", 2]]}, "side": {"maxD": 44, "slope": 0.72, "roof": "canopy", "roofCol": "#dfe3e8", "ribs": "#aeb5bf", "ov": 16, "tiers": [[3, 26, "#eb172b", "#ffffff", "#ffffff", "#ffffff", 2], [29, 44, "#eb172b", "#ffffff", "#ffffff"]]}, "sideR": {"maxD": 26, "slope": 0.66, "roof": "canopy", "roofCol": "#dfe3e8", "ov": 10, "tiers": [[3, 26, "#eb172b", "#ffffff", "#ffffff", "#ffffff", 2]]}}}, {"id": "PL-Tottenham", "name": "Tottenham", "stadium": "Tottenham Hotspur Stadium", "league": "PL", "color": "#132257", "spec": {"open": true, "closed": true, "led": "#ffffff", "corn": {"maxD": 52, "slope": 0.72, "roof": "canopy", "roofCol": "#e9ecef", "ov": 22, "lift": 5, "tiers": [[3, 20, "#132257", "#ffffff", "#ffffff"], [23, 36, "#132257", "#ffffff", "#9fb3ff"], [39, 52, "#132257", "#ffffff", "#ffffff"]]}, "far": {"maxD": 62, "slope": 0.95, "roof": "canopy", "roofCol": "#e9ecef", "ribs": "#b4bac2", "ov": 26, "lift": 5, "tiers": [[3, 62, "#132257", "#ffffff", "#ffffff", "#1b2f70", 3]]}, "side": {"maxD": 52, "slope": 0.72, "roof": "canopy", "roofCol": "#e9ecef", "ribs": "#b4bac2", "ov": 22, "lift": 5, "tiers": [[3, 20, "#132257", "#ffffff", "#ffffff"], [23, 36, "#132257", "#ffffff", "#9fb3ff"], [39, 52, "#132257", "#ffffff", "#ffffff"]]}}}];
function buildLayers(S){
  var L=[],G=[];

    var L = [], G = [];
    function add(o) { L.push({ d: o.d, fill: o.fill || 'none', stroke: o.stroke || 'none', sw: o.sw || 0, dash: o.dash || 'none', off: o.off || 0, op: o.op == null ? 1 : o.op }); }
    function f(n) { return (Math.max(-5000, Math.min(5000, n))).toFixed(1); }
    var stands = S.open ? [['far', S.far], ['left', S.side], ['right', S.sideR || S.side]] : [['ring', S]];
    if (S.extraF) stands.unshift(['far', S.extraF]);
    if (S.extraR) stands.push(['right', S.extraR]);
    if (S.extraL) stands.push(['left', S.extraL]);
    function Hd(c, d) { return 1.5 + (d - 3) * c.slope; }
    function Htop(c) { return Hd(c, c.maxD); }
    var HT = Math.max.apply(null, stands.map(function (s) { return Htop(s[1]); })), Hc = HT * 0.8;
    function pr(X, Lg, H) { var z = 1 + Lg / 30.9; return [195 + X * 7.6 / z, 205 + (1 - H / Hc) * 440 / z]; }
    function line(pts) { return 'M' + pts.map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join(' L'); }
    function poly(pts) { return line(pts) + ' Z'; }
    var LMIN = -26;
    function segs(kind, d, H, amp) {
      var w = 34 + d, far = 105 + d, k = 0, l, x, a, pts = [];
      function P(X, Lg) { var h = H + (amp ? amp * (Math.min(1, Math.abs(X) / w) * 2 - 1) : 0); k++; return pr(X, Lg, h); }
      if (kind === 'left' || kind === 'sideL') { for (l = 0; l <= 26; l++) pts.push(P(-w, LMIN + 130 * l / 26)); return [pts]; }
      if (kind === 'cornL') { pts.push(P(-w, 104)); pts.push(P(-w, 104.5 + d / 2)); pts.push(P(-w, 105 + d)); return [pts]; }
      if (kind === 'cornR') { pts.push(P(w, 105 + d)); pts.push(P(w, 104.5 + d / 2)); pts.push(P(w, 104)); return [pts]; }
      if (kind === 'right' || kind === 'sideR') { for (l = 26; l >= 0; l--) pts.push(P(w, LMIN + 130 * l / 26)); return [pts]; }
      if (kind === 'far') { var fw = (S.open && !S.closed) ? 40 : w; for (x = 0; x <= 14; x++) pts.push(P(-fw + 2 * fw * x / 14, far)); return [pts]; }
      if (S.noFar) {
        var lft = [], rgt = [];
        for (l = 0; l <= 26; l++) lft.push(P(-w, LMIN + 133 * l / 26));
        for (l = 0; l <= 26; l++) rgt.push(P(w, LMIN + 133 * l / 26));
        return [lft, rgt];
      }
      var R = S.oval ? Math.min(S.oval + d * 0.5, w - 1) : 0, i2;
      for (i2 = 0; i2 < 14; i2++) pts.push(P(-w, LMIN + (far - R - LMIN) * i2 / 14));
      for (a = 0; a <= 6; a += (S.chamfer ? 6 : 1)) { var t = Math.PI - a / 6 * Math.PI / 2; pts.push(P(-w + R + R * Math.cos(t), far - R + R * Math.sin(t))); }
      for (i2 = 1; i2 < 14; i2++) pts.push(P(-w + R + (2 * w - 2 * R) * i2 / 14, far));
      for (a = 0; a <= 6; a += (S.chamfer ? 6 : 1)) { var t2 = Math.PI / 2 - a / 6 * Math.PI / 2; pts.push(P(w - R + R * Math.cos(t2), far - R + R * Math.sin(t2))); }
      for (i2 = 1; i2 <= 14; i2++) pts.push(P(w, far - R - (far - R - LMIN) * i2 / 14));
      return [pts];
    }
    function band(kind, d1, H1, d2, H2, amp2) { var A = segs(kind, d1, H1), B = segs(kind, d2, H2, amp2); return A.map(function (s, i) { return poly(s.concat(B[i].slice().reverse())); }).join(' '); }
    function ring(kind, d, H) { return segs(kind, d, H).map(line).join(' '); }

    var bg = S.roof === 'lattice' ? '#c9ccd3' : '#0a1328';
    var scr = pr(0, 180, HT + 4);
    // Suelo exterior (se ve por las esquinas abiertas)
    add({ d: poly([pr(-140, LMIN, 0), pr(-140, 300, 0), pr(140, 300, 0), pr(140, LMIN, 0)]), fill: '#10201a' });

    if (S.roof === 'lattice') {
      var RH = HT + 26, X0 = -120, X1 = 120, c0 = S;
      for (var gx = X0, n = 0; gx <= X1; gx += 10, n++) { var p1 = []; for (var gl = LMIN; gl <= 260; gl += 10) p1.push(pr(gx, gl, RH)); add({ d: line(p1), stroke: n % 3 ? '#9ea3ad' : '#747a86', sw: n % 3 ? 1 : 2.2 }); }
      for (var tl = LMIN, m = 0; tl <= 260; tl += 12, m++) { var p2 = []; for (var tx = X0; tx <= X1; tx += 10) p2.push(pr(tx, tl, RH)); add({ d: line(p2), stroke: m % 3 ? '#a7acb5' : '#7b808b', sw: m % 3 ? 1 : 2 }); }
      for (var dg = LMIN; dg <= 260; dg += 24) add({ d: line([pr(X0, dg, RH), pr(X1, dg + 24, RH)]), stroke: '#8e939d', sw: 0.8, op: 0.8 });
      add({ d: band('ring', S.maxD + 4, HT + 21, S.maxD + 10, HT + 26), fill: '#5d626c' });
      var sd = S.maxD + 3;
      add({ d: band('ring', sd, HT + 2.3, sd, HT + 20.3), fill: '#0a1430' });
      add({ d: ring('ring', sd, HT + 11.3), stroke: S.led, sw: 6, dash: '24 5', op: 0.9 });
      add({ d: ring('ring', sd, HT + 7.3), stroke: '#9cc2ff', sw: 2, dash: '10 16', op: 0.8 });
      add({ d: ring('ring', sd, HT + 16.3), stroke: '#ffffff', sw: 1.5, dash: '6 20', op: 0.7 });
      var fl = 105 + sd;
      add({ d: poly([pr(-18, fl, HT - 0.7), pr(18, fl, HT - 0.7), pr(18, fl, HT + 21.3), pr(-18, fl, HT + 21.3)]), fill: '#101c45', stroke: '#6fa0ff', sw: 1 });
      add({ d: poly([pr(-16, fl, HT + 1.3), pr(16, fl, HT + 1.3), pr(16, fl, HT + 19.3), pr(-16, fl, HT + 19.3)]), fill: '#2a56c9', op: 0.9 });
      scr = pr(0, fl, HT + 8.8);
      add({ d: ring('ring', S.maxD + 2, HT + 0.8), stroke: '#fffbe6', sw: 2, dash: '0.1 7' });
    }
    // Torres de focos
    if (S.towers) {
      var tw = S.open ? [[-48, 118], [48, 118]] : [[-(34 + S.maxD * 0.85), 105 + S.maxD * 0.85], [34 + S.maxD * 0.85, 105 + S.maxD * 0.85]];
      tw.forEach(function (p) {
        var top = HT + 18;
        add({ d: line([pr(p[0], p[1], 0), pr(p[0], p[1], top)]), stroke: '#3a3f4a', sw: 2.5 });
        add({ d: poly([pr(p[0] - 5, p[1], top), pr(p[0] + 5, p[1], top), pr(p[0] + 5, p[1], top + 4), pr(p[0] - 5, p[1], top + 4)]), fill: '#fffbe6' });
        var c = pr(p[0], p[1], top + 2); G.push({ x: f(c[0]), y: f(c[1]), r: 34 });
      });
    }
    if (S.corner) {
      var cx0 = -(34 + S.corner.d), cl0 = 105 + S.corner.d, ch = S.corner.h;
      add({ d: poly([pr(cx0 - 14, cl0, 0), pr(cx0 + 10, cl0, 0), pr(cx0 + 10, cl0, ch), pr(cx0 - 14, cl0, ch)]), fill: S.corner.col });
      add({ d: poly([pr(cx0 - 15, cl0, ch), pr(cx0 + 11, cl0, ch), pr(cx0 - 2, cl0, ch + 4)]), fill: S.corner.roof });
      for (var wy = 3; wy < ch - 1; wy += 4) add({ d: line([pr(cx0 - 12, cl0, wy), pr(cx0 + 8, cl0, wy)]), stroke: '#ffd97a', sw: 2, dash: '0.1 4', op: 0.8 });
    }
    if (S.noFar) {
      var blocks = [[-85, -52, 16, '#3d3631'], [-50, -18, 22, '#4a413a'], [-15, 14, 18, '#3d3631'], [17, 50, 24, '#4a413a'], [53, 88, 15, '#3d3631']];
      blocks.forEach(function (b) {
        add({ d: poly([pr(b[0], 150, 0), pr(b[1], 150, 0), pr(b[1], 150, b[2]), pr(b[0], 150, b[2])]), fill: b[3] });
        for (var wh = 4; wh < b[2] - 1; wh += 3) add({ d: line([pr(b[0] + 2, 150, wh), pr(b[1] - 2, 150, wh)]), stroke: '#ffd97a', sw: 2, dash: '0.1 7', off: (wh % 4).toFixed(0), op: 0.85 });
      });
      add({ d: poly([pr(-60, 110, 0), pr(60, 110, 0), pr(60, 110, 3.5), pr(-60, 110, 3.5)]), fill: '#e4dfd4' });
      add({ d: poly([pr(-60, 110, 2.8), pr(60, 110, 2.8), pr(60, 110, 3.5), pr(-60, 110, 3.5)]), fill: '#c8102e' });
      scr = pr(0, 110, 1.5);
    }

    // Gradas y cubiertas, de la más lejana a la más cercana
    stands.forEach(function (st) {
      var kind = st[0], c = st[1], ht = Htop(c);
      var tiers = c.tiers.slice().sort(function (a, b) { return b[0] - a[0]; });
      var step = c.maxD / 44;
      tiers.forEach(function (t, ti) {
        add({ d: band(kind, t[0], Hd(c, t[0]), t[1], Hd(c, t[1])), fill: t[2] });
        var SA = segs(kind, t[0], Hd(c, t[0])), SB = segs(kind, t[1], Hd(c, t[1])), sw = t[6] || 2;
        SA.forEach(function (sa, si) {
          var sb = SB[si];
          if (t[5]) for (var q2 = 0; q2 + sw <= sa.length - 1; q2 += 2 * sw) if (Math.abs(sa[q2 + sw][0] - sa[q2][0]) + Math.abs(sa[q2 + sw][1] - sa[q2][1]) < 42) add({ d: poly(sa.slice(q2, q2 + sw + 1).concat(sb.slice(q2, q2 + sw + 1).reverse())), fill: t[5] });
          for (var q3 = sw; q3 < sa.length - 1; q3 += sw) add({ d: line([sa[q3], sb[q3]]), stroke: '#1b1d29', sw: 1.1, op: 0.55 });
        });
        var j = 0;
        for (var d = t[0] + step * 0.6; d < t[1]; d += step) {
          add({ d: ring(kind, d, Hd(c, d)), stroke: t[3], sw: 2.1, dash: '0.1 3.2', off: ((j * 1.3) % 3.2).toFixed(1), op: 0.9 });
          if (j % 2) add({ d: ring(kind, d, Hd(c, d)), stroke: t[4], sw: 2.1, dash: '0.1 11', off: ((j * 4) % 11).toFixed(1) });
          if (t[7]) add({ d: ring(kind, d - step * 0.45, Hd(c, d - step * 0.45)), stroke: t[7], sw: 0.7, op: 0.75 });
          j++;
        }
        if (ti < tiers.length - 1) {
          var nx = tiers[ti + 1][1];
          add({ d: band(kind, nx, Hd(c, nx), t[0], Hd(c, t[0])), fill: ti === 0 ? '#1b1d29' : '#23202f' });
          var mid = (nx + t[0]) / 2;
          add({ d: ring(kind, mid, Hd(c, mid)), stroke: c.sepCol || (ti === 0 ? '#ffcf7a' : '#e8e4ff'), sw: 1.6, dash: c.sepCol ? 'none' : '3 4', op: 0.85 });
        }
      });
      // Pared trasera de la grada (se ve en esquinas abiertas)
      if (S.open && !S.closed) {
        var cap = [];
        if (kind === 'far') { [-40, 40].forEach(function (ex) { add({ d: poly([pr(ex, 108, 1.5), pr(ex, 105 + c.maxD, ht), pr(ex, 105 + c.maxD, 0), pr(ex, 108, 0)]), fill: '#262a33' }); }); }
        else { var sx = kind === 'left' ? -1 : 1; add({ d: poly([pr(sx * 37, 104, 1.5), pr(sx * (34 + c.maxD), 104, ht), pr(sx * (34 + c.maxD), 104, 0), pr(sx * 37, 104, 0)]), fill: '#262a33' }); }
      }
      if (c.pillars) { var PP = segs(kind, c.maxD + 1, ht)[0]; for (var pi = 0; pi < PP.length; pi += 3) { var q = PP[pi], top = pr(0, 0, 0); add({ d: line([q, [q[0], q[1] - 34 / (1 + pi / PP.length)]]), stroke: '#c8c4bc', sw: 2.2 }); } }
      if (c.roof === 'open' || c.rim) add({ d: ring(kind, c.maxD, ht + 0.5), stroke: '#fffbe6', sw: 2, dash: '0.1 9', op: 0.9 });
      var roofKinds = c.roofSide ? [].concat(c.roofSide) : [kind];
      if (c.roof === 'canopy' || c.roof === 'wave' || c.roof === 'arch') roofKinds.forEach(function (rk) {
        var inner = c.maxD - c.ov, amp = c.roof === "wave" ? 4 : 0;
        var lf = c.lift || 0;
        add({ d: band(rk, c.maxD + 1, ht + 2 + lf, inner, ht + 6 + lf, amp), fill: c.roofCol });
        if (c.ribs) { var RA = segs(rk, c.maxD + 1, ht + 2 + lf)[0], RB = segs(rk, inner, ht + 6 + lf)[0]; for (var r3 = 0; r3 < Math.min(RA.length, RB.length); r3++) add({ d: line([RA[r3], RB[r3]]), stroke: c.ribs, sw: 1.2, op: 0.9 }); }
        if (c.ribbon && rk === 'ring') {
          add({ d: band(rk, inner, ht + 6.2, inner, ht + 1.2), fill: '#0b0f1c' });
          add({ d: ring(rk, inner, ht + 3.7), stroke: S.led, sw: 5, dash: '22 6', op: 0.95 });
          add({ d: ring(rk, inner, ht + 3.7), stroke: '#ffffff', sw: 5, dash: '6 22', off: 11, op: 0.95 });
          add({ d: ring(rk, inner, ht + 6.6), stroke: '#fffbe6', sw: 2.6, dash: '0.1 3.2' });
        }
        add({ d: ring(rk, inner + 0.5, ht + 5.6 + lf), stroke: '#fff6d6', sw: 1.6, op: 0.9 });
        add({ d: ring(rk, inner + 1.5, ht + 5.2 + lf), stroke: '#fffbe6', sw: 2, dash: '0.1 8' });
        if (c.roof === 'arch') {
          var A = segs(rk, c.maxD + 1, ht + 2)[0], B = segs(rk, inner, ht + 6)[0], zz = [];
          for (var zi = 0; zi < Math.min(A.length, B.length); zi++) zz.push(zi % 2 ? A[zi] : B[zi]);
          add({ d: line(zz), stroke: '#b5b8be', sw: 1 });
        }
      });
      if (c.beams) {
        var bi = c.maxD - c.ov, bh = ht + 7 + (c.lift || 0), bx = 34 + bi, bl = 105 + bi, ext = 34 + c.maxD + 12;
        var beams = [[[-bx, LMIN], [-bx, 105 + c.maxD + 12]], [[bx, LMIN], [bx, 105 + c.maxD + 12]], [[-ext, bl], [ext, bl]]];
        beams.forEach(function (bm) {
          var A1 = pr(bm[0][0], bm[0][1], bh), A2 = pr(bm[1][0], bm[1][1], bh), B1 = pr(bm[0][0], bm[0][1], bh + 3.5), B2 = pr(bm[1][0], bm[1][1], bh + 3.5);
          add({ d: poly([A1, A2, B2, B1]), fill: '#3a4150', stroke: '#566075', sw: 1 });
          add({ d: line([A1, A2]), stroke: '#fffbe6', sw: 2.4, dash: '0.1 4.5' });
        });
      }
      if (c.cornerScreens) {
        [-1, 1].forEach(function (sg) {
          var cx = sg * (34 + c.maxD * 0.62), cl = 105 + c.maxD * 0.62, h1 = ht - 2;
          add({ d: poly([pr(cx - 5 * sg, cl - 5, h1), pr(cx + 5 * sg, cl + 5, h1), pr(cx + 5 * sg, cl + 5, h1 + 6), pr(cx - 5 * sg, cl - 5, h1 + 6)]), fill: '#0b0f1c', stroke: '#3a4152', sw: 1 });
          add({ d: poly([pr(cx - 4.4 * sg, cl - 4.4, h1 + 0.6), pr(cx + 4.4 * sg, cl + 4.4, h1 + 0.6), pr(cx + 4.4 * sg, cl + 4.4, h1 + 5.4), pr(cx - 4.4 * sg, cl - 4.4, h1 + 5.4)]), fill: '#1d3f96' });
          if (sg < 0) scr = pr(cx, cl, h1 + 2.4);
        });
      }
      // Marcador en el fondo
      if ((kind === 'far' || (kind === 'ring' && !S.noFar)) && S.roof !== 'lattice' && !S.noBoard && c === (S.open ? S.far : S) && !(S.extraF && kind === 'ring')) {
        var covered = (c.roof === 'canopy' || c.roof === 'wave' || c.roof === 'arch') && !c.roofSide;
        var fe = covered ? 105 + c.maxD - c.ov + 2 : 105 + c.maxD + 1, h0 = covered ? ht - 3 : ht + 1;
        add({ d: poly([pr(-11, fe, h0), pr(11, fe, h0), pr(11, fe, h0 + 8), pr(-11, fe, h0 + 8)]), fill: '#0b0f1c', stroke: '#3a4152', sw: 1 });
        add({ d: poly([pr(-10, fe, h0 + 0.8), pr(10, fe, h0 + 0.8), pr(10, fe, h0 + 7.2), pr(-10, fe, h0 + 7.2)]), fill: '#1d3f96' });
        scr = pr(0, fe, h0 + 3.6);
      }
    });

    if (S.closed) {
      var cc0 = [S.far, S.side, S.sideR || S.side].sort(function (a, b) { return b.maxD - a.maxD; })[0];
      ['cornL', 'cornR'].forEach(function (ck) {
        cc0.tiers.forEach(function (t) {
          add({ d: band(ck, t[0], Hd(cc0, t[0]), t[1], Hd(cc0, t[1])), fill: t[2] });
          var stp = cc0.maxD / 44, jj = 0;
          for (var d = t[0] + stp * 0.6; d < t[1]; d += stp) { add({ d: ring(ck, d, Hd(cc0, d)), stroke: t[3], sw: 2.1, dash: '0.1 3.2', off: ((jj * 1.3) % 3.2).toFixed(1), op: 0.9 }); jj++; }
        });
        add({ d: ring(ck, cc0.maxD, Htop(cc0) + 0.5), stroke: '#fffbe6', sw: 2, dash: '0.1 6', op: 0.9 });
      });
    }
    // Vallas LED y césped
    var bk = S.open ? 'ring0' : 'ring';
    add({ d: poly([pr(-37, LMIN, 0), pr(-37, 108, 0), pr(37, 108, 0), pr(37, LMIN, 0)]), fill: '#2f8f45' });
    var ledPath = line([pr(-36, LMIN, 0.55), pr(-36, 107, 0.55), pr(36, 107, 0.55), pr(36, LMIN, 0.55)]);
    add({ d: poly([pr(-36, LMIN, 0), pr(-36, 107, 0), pr(36, 107, 0), pr(36, LMIN, 0)]) + ' ' + poly([pr(-36, LMIN, 1.1), pr(-36, 107, 1.1), pr(36, 107, 1.1), pr(36, LMIN, 1.1)]), fill: 'none', stroke: '#0b0f24', sw: 4 });
    add({ d: ledPath, stroke: S.led, sw: 3, dash: '18 4' });
    add({ d: ledPath, stroke: '#ffffff', sw: 3, dash: '5 30', off: 3, op: 0.9 });
    add({ d: poly([pr(-35, LMIN, 0), pr(-35, 106.5, 0), pr(35, 106.5, 0), pr(35, LMIN, 0)]), fill: '#3a9a4e' });
    for (var st2 = 0; st2 < 105; st2 += 5.25) if ((st2 / 5.25) % 2) add({ d: poly([pr(-34, st2, 0), pr(34, st2, 0), pr(34, st2 + 5.25, 0), pr(-34, st2 + 5.25, 0)]), fill: '#338c46' });
    function ln(pts) { add({ d: line(pts), stroke: '#ffffff', sw: 1.6, op: 0.9 }); }
    ln([pr(-34, LMIN, 0), pr(-34, 105, 0), pr(34, 105, 0), pr(34, LMIN, 0)]);
    ln([pr(-34, 0, 0), pr(34, 0, 0)]);
    ln([pr(-34, 52.5, 0), pr(34, 52.5, 0)]);
    var cc = []; for (var q = 0; q <= 60; q++) { var an = q / 60 * Math.PI * 2; cc.push(pr(9.15 * Math.cos(an), 52.5 + 9.15 * Math.sin(an), 0)); } ln(cc);
    [0, 105].forEach(function (g) {
      var s = g ? -1 : 1;
      ln([pr(-20.15, g, 0), pr(-20.15, g + s * 16.5, 0), pr(20.15, g + s * 16.5, 0), pr(20.15, g, 0)]);
      ln([pr(-9.15, g, 0), pr(-9.15, g + s * 5.5, 0), pr(9.15, g + s * 5.5, 0), pr(9.15, g, 0)]);
      var ap = []; for (var k = 0; k <= 30; k++) { var aa = -0.93 + k / 30 * 1.86, dd = 11 + 9.15 * Math.cos(aa); if (dd >= 16.5) ap.push(pr(9.15 * Math.sin(aa), g + s * dd, 0)); } ln(ap);
    });
    add({ d: poly([pr(-3.66, 105, 2.44), pr(-3.66, 107.2, 2), pr(3.66, 107.2, 2), pr(3.66, 105, 2.44)]), fill: '#ffffff', op: 0.25 });
    add({ d: poly([pr(-3.66, 107.2, 2), pr(3.66, 107.2, 2), pr(3.66, 107.2, 0), pr(-3.66, 107.2, 0)]), fill: '#ffffff', op: 0.2 });
    add({ d: line([pr(-3.66, 105, 0), pr(-3.66, 105, 2.44), pr(3.66, 105, 2.44), pr(3.66, 105, 0)]), stroke: '#ffffff', sw: 1.8 });
      return {layers:L,glows:G,bg:bg};
}
function svg(S){
  var v=buildLayers(S),o='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 640" preserveAspectRatio="xMidYMin slice"><defs><radialGradient id="fgGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe6" stop-opacity="0.9"/><stop offset="0.35" stop-color="#fff3c4" stop-opacity="0.3"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient><linearGradient id="fgScrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050912" stop-opacity="0.6"/><stop offset="0.5" stop-color="#050912" stop-opacity="0.55"/><stop offset="1" stop-color="#050912" stop-opacity="0.9"/></linearGradient></defs><rect width="390" height="640" fill="'+v.bg+'"/>';
  if(v.bg!=='#c9ccd3')o+='<circle cx="48" cy="96" r="1" fill="#fff" opacity=".6"/><circle cx="120" cy="70" r="1" fill="#fff" opacity=".5"/><circle cx="210" cy="84" r="1" fill="#fff" opacity=".6"/><circle cx="300" cy="64" r="1" fill="#fff" opacity=".5"/><circle cx="350" cy="110" r="1" fill="#fff" opacity=".4"/>';
  v.layers.forEach(function(l){o+='<path d="'+l.d+'" fill="'+l.fill+'" stroke="'+l.stroke+'" stroke-width="'+l.sw+'" stroke-dasharray="'+l.dash+'" stroke-dashoffset="'+l.off+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+l.op+'"/>';});
  v.glows.forEach(function(g){o+='<circle cx="'+g.x+'" cy="'+g.y+'" r="'+g.r+'" fill="url(#fgGlow)"/>';});
  return o+'<rect width="390" height="640" fill="url(#fgScrim)"/></svg>';
}
var KEY='fg_team',bgEl,pick;
function team(){var id=null;try{id=localStorage.getItem(KEY);}catch(e){}return TEAMS.find(function(t){return t.id===id;})||null;}
var lastUrl=null,curTeam=null;
function paint(){
  if(!curTeam)return;
  bgEl=bgEl||document.getElementById('fgStadium');
  var dpr=Math.min(window.devicePixelRatio||1,2),vw=window.innerWidth,vh=window.innerHeight;
  var blob=new Blob([svg(curTeam.spec)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
  img.onload=function(){
    var c=document.createElement('canvas');c.width=Math.round(vw*dpr);c.height=Math.round(vh*dpr);
    var ctx=c.getContext('2d');ctx.scale(dpr,dpr);
    var sc=Math.max(vw/390,vh/640),w=390*sc,h=640*sc;ctx.fillStyle='#050912';ctx.fillRect(0,0,vw,vh);ctx.drawImage(img,(vw-w)/2,0,w,h);
    if(h<vh){ctx.fillStyle='#050912';ctx.fillRect(0,h-1,vw,vh-h+1);}
    URL.revokeObjectURL(url);
    var dataUrl=c.toDataURL('image/png');
    bgEl.style.backgroundImage='url("'+dataUrl+'")';
  };
  img.src=url;
}
function apply(t){
  bgEl=bgEl||document.getElementById('fgStadium');curTeam=t;
  if(!t){document.body.classList.remove('hasteam');bgEl.style.backgroundImage='';return;}
  document.body.classList.add('hasteam');paint();
  var b=document.getElementById('btnTeam');if(b)b.textContent='🏟️ '+t.name;
}
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(paint,250);});
function open(){
  pick=pick||document.getElementById('teamPick');
  var cur=team(),lg=(cur&&cur.league)||'LL';
  function render(){
    pick.querySelectorAll('.tp-tab').forEach(function(x){x.setAttribute('aria-selected',x.dataset.lg===lg);});
    var grid=pick.querySelector('.tp-grid');grid.innerHTML='';
    TEAMS.filter(function(t){return t.league===lg;}).forEach(function(t){
      var b=document.createElement('button');b.type='button';b.className='tp-team'+(cur&&cur.id===t.id?' on':'');
      b.style.setProperty('--c',t.color);b.innerHTML='<span class="tp-dot"></span><span class="tp-n">'+t.name+'</span><span class="tp-s">'+t.stadium+'</span>';
      b.onclick=function(){try{localStorage.setItem(KEY,t.id);}catch(e){}apply(t);pick.hidden=true;};
      grid.appendChild(b);
    });
  }
  pick.querySelectorAll('.tp-tab').forEach(function(x){x.onclick=function(){lg=x.dataset.lg;render();};});
  pick.querySelector('.tp-skip').onclick=function(){try{localStorage.setItem(KEY,'none');}catch(e){}pick.hidden=true;};
  render();pick.hidden=false;
}
document.addEventListener('DOMContentLoaded',function(){
  var t=team();apply(t);
  var has=false;try{has=!!localStorage.getItem(KEY);}catch(e){}
  if(!has)open();
  var b=document.getElementById('btnTeam');if(b)b.onclick=open;
});
window.FG_STADIUM={teams:TEAMS,svg:svg,open:open};
})();
