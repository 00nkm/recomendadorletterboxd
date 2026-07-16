export interface Movie {
  id: number
  title: string
  year: number
  director: string
  country: string
  genres: string[]
  moods: string[]
  decade: string
  matchScore: number
  matchReason: string
  runtime: number
  posterUrl: string
  posterColor: string
}

export const GENRES = ["Drama", "Thriller", "Comedy", "Sci-Fi", "Horror", "Romance", "Crime", "Animation"]
export const MOODS = ["Dark", "Uplifting", "Mind-bending", "Emotional", "Tense", "Melancholic"]
export const DECADES = ["2020s", "2010s", "2000s", "1990s", "Classic"]

export const mockMovies: Movie[] = [
  {
    id: 1,
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    country: "South Korea",
    genres: ["Thriller", "Drama"],
    moods: ["Dark", "Tense"],
    decade: "2010s",
    matchScore: 97,
    matchReason: "Your five-star ratings cluster around Korean cinema and class-conscious narratives. Bong's meticulous framing style mirrors the directors you rate most consistently.",
    runtime: 132,
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop&auto=format",
    posterColor: "#1a1a2e",
  },
  {
    id: 2,
    title: "The Lighthouse",
    year: 2019,
    director: "Robert Eggers",
    country: "USA",
    genres: ["Horror", "Drama"],
    moods: ["Dark", "Mind-bending"],
    decade: "2010s",
    matchScore: 94,
    matchReason: "You consistently favor slow-burn psychological tension and period-set atmosphere. Eggers' monochrome 1.19:1 frame turns isolation into its own character.",
    runtime: 109,
    posterUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop&auto=format",
    posterColor: "#0e1a1f",
  },
  {
    id: 3,
    title: "Portrait of a Lady on Fire",
    year: 2019,
    director: "Céline Sciamma",
    country: "France",
    genres: ["Romance", "Drama"],
    moods: ["Emotional", "Melancholic"],
    decade: "2010s",
    matchScore: 92,
    matchReason: "Your diary entries mention Renoir and slow European cinema repeatedly. Sciamma's gaze-centric romance operates with the same careful restraint you prize.",
    runtime: 122,
    posterUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=600&fit=crop&auto=format",
    posterColor: "#1c1210",
  },
  {
    id: 4,
    title: "Burning",
    year: 2018,
    director: "Lee Chang-dong",
    country: "South Korea",
    genres: ["Drama", "Thriller"],
    moods: ["Melancholic", "Tense"],
    decade: "2010s",
    matchScore: 91,
    matchReason: "Your watchlist is dense with Murakami adaptations. Lee turns ambiguity into dread with a patience rarely seen — his films reward the close attention you clearly give.",
    runtime: 148,
    posterUrl: "https://images.unsplash.com/photo-1440688807730-73e4e2169fb8?w=400&h=600&fit=crop&auto=format",
    posterColor: "#1a1408",
  },
  {
    id: 5,
    title: "The Zone of Interest",
    year: 2023,
    director: "Jonathan Glazer",
    country: "UK / Poland",
    genres: ["Drama"],
    moods: ["Dark", "Emotional"],
    decade: "2020s",
    matchScore: 89,
    matchReason: "You've rated Glazer's previous work highly and return to difficult historical subjects often. This film's off-screen horror demands precisely the kind of active viewer you are.",
    runtime: 105,
    posterUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=600&fit=crop&auto=format",
    posterColor: "#0f1a10",
  },
  {
    id: 6,
    title: "Memoria",
    year: 2021,
    director: "Apichatpong Weerasethakul",
    country: "Colombia / Thailand",
    genres: ["Drama", "Sci-Fi"],
    moods: ["Mind-bending", "Melancholic"],
    decade: "2020s",
    matchScore: 87,
    matchReason: "Your ratings suggest deep patience for ambient, contemplative cinema. Weerasethakul builds films from silence the way a poet builds from white space.",
    runtime: 136,
    posterUrl: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=600&fit=crop&auto=format",
    posterColor: "#0a1520",
  },
  {
    id: 7,
    title: "Past Lives",
    year: 2023,
    director: "Celine Song",
    country: "USA / South Korea",
    genres: ["Romance", "Drama"],
    moods: ["Emotional", "Melancholic"],
    decade: "2020s",
    matchScore: 93,
    matchReason: "Your top-rated films lean toward quiet heartbreak over spectacle. Song's debut captures the weight of roads not taken with a precision that only comes from lived experience.",
    runtime: 106,
    posterUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=600&fit=crop&auto=format",
    posterColor: "#1a1520",
  },
  {
    id: 8,
    title: "Aftersun",
    year: 2022,
    director: "Charlotte Wells",
    country: "UK",
    genres: ["Drama"],
    moods: ["Melancholic", "Emotional"],
    decade: "2020s",
    matchScore: 95,
    matchReason: "You've rated memory-driven narratives among your highest. Wells builds loss from Super 8 grain and ambient vacation footage — a film that hits hardest after the credits roll.",
    runtime: 101,
    posterUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&auto=format",
    posterColor: "#0a1520",
  },
]
