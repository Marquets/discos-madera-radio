export type Disco = { title: string; artist: string; cover: string; url: string; comment?: string };

export type Top = { name: string; discos: Disco[] };

// Title, artist and cover copied from Spotify once, from each album's link, so the page never asks Spotify
export const TOPS: Top[] = [
  {
    name: "Marco",
    discos: [
      { title: "Live at Carnegie Hall", artist: "Cameron Winter", cover: "https://i.scdn.co/image/ab67616d0000b2739f7045289e0dc19f1d45aa5d", url: "https://open.spotify.com/album/5FjFRlo7diqzHNpVz5wJCt" },
      { title: "It Goes On", artist: "Westside Cowboy", cover: "https://i.scdn.co/image/ab67616d0000b27359b4c22ba76349483371d480", url: "https://open.spotify.com/album/3dWKCKeiWtxjDNPTbGCQTO" },
      { title: "Vol.II", artist: "Angine de Poitrine", cover: "https://i.scdn.co/image/ab67616d0000b2734821b77fd92093513d7634b5", url: "https://open.spotify.com/album/3FqqIeynZXFBcyLS9FlWMo" },
      { title: "Look For Your Mind!", artist: "The Lemon Twigs", cover: "https://i.scdn.co/image/ab67616d0000b273e45094c8e7387ddb85f82e12", url: "https://open.spotify.com/album/4TSzbco3bzQfnqj3KL196w" },
      { title: "Un Sol dentro", artist: "Las Nietas del Charli", cover: "https://i.scdn.co/image/ab67616d0000b2737cc1a28a73e5f51cd3ff9215", url: "https://open.spotify.com/album/4xFxPU5N0Er8jCSzt36fje" },
      { title: "Autosmile", artist: "@", cover: "https://i.scdn.co/image/ab67616d0000b27393c812017763535bb202b703", url: "https://open.spotify.com/album/53a19c7TkUcgvZ1lnPLQCr" },
      { title: "Massive Champion", artist: "Getdown Services", cover: "https://i.scdn.co/image/ab67616d0000b2733f792df378fd3d1ffaffd5d5", url: "https://open.spotify.com/album/0mL98BOnYAVFSCYV9x5ZXK" },
      { title: "Train on the Island", artist: "Aldous Harding", cover: "https://i.scdn.co/image/ab67616d0000b27373870381d130b608e2deb080", url: "https://open.spotify.com/album/0AePRMHymMl4oHBb5EuGiV" },
      { title: "Terrestrials", artist: "Pond", cover: "https://i.scdn.co/image/ab67616d0000b2732fe59363f651731c420fddbc", url: "https://open.spotify.com/album/2zV4jllZ8rjHsbUQjaMewQ" },
      { title: "The Holy Cross Tigers", artist: "Twisted Teens", cover: "https://i.scdn.co/image/ab67616d0000b2739d3cb1617c4102f951a24e8b", url: "https://open.spotify.com/album/34rN1EeWCYWzPCwIaUXqQr" },
    ],
  },
];
