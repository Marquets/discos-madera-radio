// How lively each song is, which decides the time slots it plays in (Spain time):
//   madrugada 0–8   tranquila
//   mañana    8–13  tranquila, media
//   tarde     13–20 todas
//   noche     20–24 media, animada
// A song left out of this list plays in every slot, so new ones sound from the start.
// Spotify track id (open.spotify.com/track/<THIS>) → energy.
export type Energy = "tranquila" | "media" | "animada";

export const SLOTS: { from: number; name: string; plays: Energy[] }[] = [
  { from: 0, name: "madrugada", plays: ["tranquila"] },
  { from: 8, name: "mañana", plays: ["tranquila", "media"] },
  { from: 13, name: "tarde", plays: ["tranquila", "media", "animada"] },
  { from: 20, name: "noche", plays: ["media", "animada"] },
];

export const ENERGY: Record<string, Energy> = {
  "29obLp4cP6PZhjMFujRQsh": "media", // dizzy — strongboi
  "5leuQ3hbPgcxPLNrbgnCSW": "tranquila", // Marathon — Maria BC
  "29YCXYGQo3YU7lx3g2EgLI": "tranquila", // Run — Fine
  "6QoOy0hBf3GnUyZiEVCHol": "tranquila", // It All Fell in the River — Cameron Winter
  "2cLjmhezy7CVKMTRAOcnEx": "media", // Strangers — Black Country, New Road
  "6JFgBE2seXKTUkHdOVq3N1": "tranquila", // What The World Needs Now Is Love — Burt Bacharach
  "3PK4Xc1Suw09k3HX6IeQHM": "media", // im not your man — Junior Mesa
  "0zZ5TnmUIub96AsZmkCXYS": "media", // Indecision — Rex Orange County
  "1L4FhDRm94CBlIay2MDuc0": "media", // I Can't Fall — This Is Lorelei
  "5Qi5snmgfiwgKQDfYFuK5O": "media", // Moving Pictures — Richard Houghten
  "4gRA0i5sxx3jAhHaVjPnUN": "animada", // Use Me — Bill Withers
  "0QcAzU8kdnIN3DQhtlvv1P": "animada", // Rain — Pond
  "7eG85nwjHifIsH99lbD62L": "animada", // Boom Clack — Jon Kennedy
  "52wuAnDISsad9FNW3dx2cU": "media", // The Velvet Showdown — Velvet Meadow
  "2EgeIJr1QqL3t0ZUdMrfCL": "media", // New Realm — Glyders
  "22G8rQDLJTeJzjQWXZErre": "animada", // Hang Up Your Hang Ups — Herbie Hancock
  "7lRHUd0jWyxqqDcyiE7O0s": "animada", // Noche de Setas — Pony Bravo
  "3I0rWmF86CwQpajoZjkXtG": "tranquila", // Jynweythek — Aphex Twin
  "6gq4QRJ5dcBMyR4nyS8IaX": "media", // Hide - Raw — Dorian Concept
  "20GBgLYYqg0aAssKspk8rY": "tranquila", // And Dream Of Sheep — Kate Bush
  "7a0jkfRxobS5fC6siXK7YZ": "tranquila", // He Venido — Los Zafiros
  "6YNfrgCOy1dCXZKKRUuZVq": "tranquila", // Everything Means Nothing To Me — Elliott Smith
  "6V486jCRSNHh0tBAMSLwI0": "tranquila", // Who Knows Where the Time Goes — Nina Simone
  "34HkzjN1ieQeiHKmq1w6cw": "tranquila", // Train on the Island — Aldous Harding
  "5FymbsqTTkziBCf9kn2Fd2": "tranquila", // Yvonne — Foxwarren
  "2ew283WnYOOxKXeXIKxSzB": "media", // Early In The Morning — Tinsley Ellis
  "073LeKgK8j7cd2GB8l1SHU": "animada", // Can't Take My Eyes Off You — Ambassadors
  "7G7CveTF706x0PYxnpDsM5": "animada", // Coolo — Illya Kuryaki & The Valderramas
  "7mwwMqdEqG1QPxlJzVksl4": "tranquila", // Where Can I Go Without You — Keith Jarrett, Charlie Haden
  "7EhORcz05P6mQVMZ4nJRFU": "tranquila", // eyes of them all — Andy Shauf
  "06QttfmxiOHL28cqeptBc9": "media", // fuego — kiut
  "2VJbSC89djtVH9C1ljoQEn": "tranquila", // Sunset — Good Night Sleep
  "2FqwKJ2zLAOZmtwf3Eq8IA": "tranquila", // The Moth — Mucho Mungo
  "1M5pA10OqYj0yLIAzMyqcN": "media", // sobre su VIENTRE — SANTA ANA
  "1kG0UxwsJi6EDlNQPg4TPu": "tranquila", // En Casa (con Marina) — Sosega
  "3H7CwBK4W3MQGOnN0h5vic": "tranquila", // The Weather — Dim Moon
  "320kcPdTD32bPihVd9ad84": "tranquila", // see / hear — elio seto
  "50J775otNAQ0Ni7CxJ2qqk": "media", // on est pareil — Céline Dessberg
  "1qAeJljgAb6J2Td4c36JGG": "animada", // More Bad Miles Of Road — Little Barrie
  "4S0ea0O6Ijc9tOkjquJOni": "media", // Ain't It Sad — Color Green
  "0qaMBOFU8TjvmZgB9YaBfP": "animada", // Look For Your Mind — The Lemon Twigs
  "5AHLePht8HEwMCNdYTu4jd": "media", // A Dream Is All I Know — The Lemon Twigs
  "6QDbtyHTTDKs2VnxNyqDVn": "tranquila", // Regálame Esta Noche — Roberto Cantoral
  "1IXY846kp1yEYqLhAIJNyu": "tranquila", // you see a dragon in the cloud… — coulou's cafe
  "1iGjcEPJeXlLRYZVue1WXk": "media", // Sweet Baby — Grateful Shred
  "00F2J6Du0rcyvY6rP1UHKW": "animada", // Colorful Revolution — The Redwalls
  "2cgUuAbgKxogUes21l6BSq": "media", // River Rises — The Gaddabouts
  "1jzqp5fogF52Sl7vB9i51j": "media", // California Stars — Billy Bragg, Wilco
  "2pv2bS54WfwkbEQygh1S8T": "media", // Straight From The Heart — Irma Thomas
  "5GWCndQ8ykzf6rYRvwrFcj": "media", // Anyone Who Knows What Love Is — Irma Thomas
  "0QMHVTnrFTQJoaqmkdsKhT": "animada", // I Wish — Skee-Lo
  "5RN42ghX3LURrittZmBjVD": "animada", // Beef Jerky — Cibo Matto
};
