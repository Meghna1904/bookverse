
export type CatalogueBook = {
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  genre?: string;
  language?: string;
  pageCount?: number;
  publisher?: string;
  publishedYear?: number;
  series?: string;
  externalRef?: string;
  format?: string;
};

export const GENRES = [
  "Literary Fiction",
  "Classics",
  "Poetry",
  "Historical Fiction",
  "Non-fiction",
  "Memoir",
  "Mythology",
  "Essays",
  "Mystery",
  "Science Fiction",
  "Fantasy",
  "Romance",
  "Short Stories",
  "Children's",
  "Philosophy",
  "Travel",
];

export const LANGUAGES = [
  "English",
  "Malayalam",
  "Hindi",
  "Tamil",
  "Kannada",
  "Bengali",
  "Marathi",
  "Telugu",
  "Sanskrit",
  "French",
  "Spanish",
  "Japanese",
  "Arabic",
];

export const shelfCover = (isbn?: string) =>
  isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : undefined;

type Seed = [
  title: string,
  author: string,
  isbn: string,
  genre: string,
  language: string,
  pages: number,
  year: number,
  publisher: string,
  description: string,
  series?: string,
];

const CATALOGUE_SEED: Seed[] = [
  ["The Remains of the Day", "Kazuo Ishiguro", "9780571258246", "Literary Fiction", "English", 258, 1989, "Faber & Faber", "A butler looks back on decades of service and the quiet loyalties that shaped his life."],
  ["To the Lighthouse", "Virginia Woolf", "9780156907392", "Classics", "English", 209, 1927, "Harcourt", "A family, a summer house, and a long-delayed journey across the bay."],
  ["Mrs Dalloway", "Virginia Woolf", "9780156628709", "Classics", "English", 194, 1925, "Harcourt", "One June day in London, told through the minds of a party-giver and a haunted veteran."],
  ["The God of Small Things", "Arundhati Roy", "9780006550686", "Literary Fiction", "English", 340, 1997, "Fourth Estate", "Twins return to Kerala and to the small, terrible events that reshaped their family."],
  ["Beloved", "Toni Morrison", "9781400033416", "Classics", "English", 324, 1987, "Vintage", "A house haunted by a child, and a mother haunted by the choices she made."],
  ["The Namesake", "Jhumpa Lahiri", "9780618485222", "Literary Fiction", "English", 291, 2003, "Mariner", "A young man grows up between Calcutta and Massachusetts, carrying a name that never quite fits."],
  ["Atonement", "Ian McEwan", "9780385721790", "Literary Fiction", "English", 351, 2001, "Anchor", "A child's misreading of an afternoon changes three lives across the century."],
  ["The Book Thief", "Markus Zusak", "9780375842207", "Historical Fiction", "English", 552, 2005, "Knopf", "Death narrates the story of a girl stealing books in Nazi Germany."],
  ["Norwegian Wood", "Haruki Murakami", "9780375704024", "Literary Fiction", "English", 296, 1987, "Vintage", "A student in 1960s Tokyo remembers first love and the people he could not hold on to."],
  ["Kafka on the Shore", "Haruki Murakami", "9781400079278", "Literary Fiction", "English", 467, 2002, "Vintage", "A runaway boy and an old man who talks to cats move toward each other across Japan."],
  ["A Room of One's Own", "Virginia Woolf", "9780156787338", "Essays", "English", 114, 1929, "Harcourt", "Woolf's landmark essay on women, money, independence and the conditions needed to make art."],
  ["The Shadow Lines", "Amitav Ghosh", "9780143066354", "Literary Fiction", "English", 288, 1988, "Penguin", "A family history moving between Calcutta, Dhaka and London, and the borders history draws through people."],
  ["The Hungry Tide", "Amitav Ghosh", "9780618711666", "Literary Fiction", "English", 328, 2004, "Mariner", "In the Sundarbans, tides erase islands, and a translator searches for a lost legend."],
  ["Persepolis", "Marjane Satrapi", "9780375714573", "Memoir", "English", 153, 2000, "Pantheon", "Growing up in revolutionary Tehran, in stark black-and-white panels."],
  ["The Sense of an Ending", "Julian Barnes", "9780307949326", "Literary Fiction", "English", 163, 2011, "Knopf", "A man revisits a letter from his youth and discovers how unreliable his own story has been."],
  ["The Palace of Illusions", "Chitra Banerjee Divakaruni", "9780385515993", "Mythology", "English", 360, 2008, "Doubleday", "The Mahabharata told in the voice of Panchaali, queen and witness to a war of kings."],
  ["Mornings in Jenin", "Susan Abulhawa", "9781608190461", "Historical Fiction", "English", 352, 2010, "Bloomsbury", "Four generations of a Palestinian family, displaced from their village in 1948."],
  ["Gitanjali", "Rabindranath Tagore", "9781438513911", "Poetry", "Bengali", 96, 1910, "Macmillan", "Tagore's song offerings to the divine, in his own English translations."],
  ["The Alchemist", "Paulo Coelho", "9780062315007", "Fiction", "English", 208, 1988, "HarperOne", "A shepherd boy travels from Andalusia to Egypt chasing a recurring dream."],
  ["Pachinko", "Min Jin Lee", "9781455563937", "Historical Fiction", "English", 490, 2017, "Grand Central", "A Korean family builds a life in Japan across four generations."],
  ["Man's Search for Meaning", "Viktor E. Frankl", "9780807014295", "Non-fiction", "English", 165, 1946, "Beacon", "A psychiatrist's account of survival in the camps, and of meaning as a reason to live."],
  ["The House of the Spirits", "Isabel Allende", "9781501117015", "Literary Fiction", "English", 496, 1982, "Atria", "Three generations of the Trueba family, and a country moving toward revolution."],
  ["Middlemarch", "George Eliot", "9780141439549", "Classics", "English", 880, 1871, "Penguin Classics", "Lives and ambitions interlock in a provincial English town on the edge of change."],
  ["Jane Eyre", "Charlotte Brontë", "9780141441146", "Classics", "English", 507, 1847, "Penguin Classics", "A governess claims her own life in a house full of secrets."],
  ["Pride and Prejudice", "Jane Austen", "9780141439518", "Classics", "English", 435, 1813, "Penguin Classics", "Elizabeth Bennet and Mr Darcy misjudge each other, delightfully."],
  ["The Ministry of Utmost Happiness", "Arundhati Roy", "9781529112153", "Literary Fiction", "English", 445, 2017, "Hamish Hamilton", "A graveyard in Delhi becomes a home for those the new India has left outside."],
  ["The Overstory", "Richard Powers", "9780393356687", "Literary Fiction", "English", 502, 2018, "Norton", "Nine strangers, one forest, and a growing refusal to accept the world as it is."],
  ["One Hundred Years of Solitude", "Gabriel García Márquez", "9780060883287", "Classics", "English", 417, 1967, "Harper", "Seven generations of the Buendía family in the imagined town of Macondo."],
  ["The Seven Moons of Maali Almeida", "Shehan Karunatilaka", "9780393882070", "Literary Fiction", "English", 386, 2022, "Norton", "A war photographer has seven moons to find his photographs and reach the people he loved."],
  ["Tomb of Sand", "Geetanjali Shree", "9780143448747", "Literary Fiction", "Hindi", 740, 2018, "Penguin", "An eighty-year-old woman travels to Pakistan and refuses to be reduced to anyone's mother."],
  ["Circe", "Madeline Miller", "9780316556347", "Mythology", "English", 393, 2018, "Little, Brown", "The witch of Aiaia tells her own story, from exile to the edge of the heroic world."],
  ["The Book of Disquiet", "Fernando Pessoa", "9780811219181", "Literary Fiction", "English", 544, 1982, "New Directions", "A dreamer's fragmented diary from a rented room in Lisbon."],
  ["My Brilliant Friend", "Elena Ferrante", "9781609450786", "Literary Fiction", "English", 331, 2011, "Europa", "Two girls grow up in postwar Naples, bound together by love and rivalry.", "Neapolitan Novels"],
  ["Ghachar Ghochar", "Vivek Shanbhag", "9780143426370", "Literary Fiction", "Kannada", 128, 2013, "Penguin", "A family's new money quietly rearranges everyone inside the house."],
  ["Aadujeevitham", "Benyamin", "9788190659860", "Literary Fiction", "Malayalam", 298, 2008, "Green Books", "A migrant worker from Kerala is trapped in the Arabian desert and survives on memory."],
  ["Khasakkinte Itihasam", "O. V. Vijayan", "9788126414228", "Classics", "Malayalam", 208, 1969, "DC Books", "A young teacher arrives in a village of rumours and discovers a world outside his education."],
  ["Karukku", "Bama", "9780199450411", "Memoir", "Tamil", 142, 1992, "Oxford India", "A Dalit woman's account of childhood, conversion and refusal in rural Tamil Nadu."],
  ["Mrichakatika", "Sudraka", "9788172763660", "Classics", "Sanskrit", 176, 1890, "Motilal Banarsidass", "The little clay cart: a Sanskrit comedy of love, money and mistaken identity."],
  ["The White Tiger", "Aravind Adiga", "9781416562603", "Literary Fiction", "English", 276, 2008, "Free Press", "A driver writes a letter to the Chinese premier about how he escaped the rooster coop."],
  ["A Suitable Boy", "Vikram Seth", "9780060786526", "Literary Fiction", "English", 1474, 1993, "Harper", "A mother searches for a husband for her daughter across post-independence India."],
  ["The  100-Year-Old Man Who Climbed Out the Window and Disappeared", "Jonas Jonasson", "9781401324103", "Fiction", "English", 388, 2009, "Hesperus", "An centenarian leaves his care home and stumbles through a century of history."],
  ["Solaris", "Stanisław Lem", "9780156027601", "Science Fiction", "English", 204, 1961, "Harcourt", "A planet-sized ocean studies the people who come to study it."],
  ["The Left Hand of Darkness", "Ursula K. Le Guin", "9780441478125", "Science Fiction", "English", 304, 1969, "Ace", "An envoy to an ice-bound world learns how much of identity is learned."],
  ["Wuthering Heights", "Emily Brontë", "9780141439556", "Classics", "English", 416, 1847, "Penguin Classics", "Love and revenge on the Yorkshire moors."],
  ["The Prophet", "Kahlil Gibran", "9780394404288", "Poetry", "English", 107, 1923, "Knopf", "Twenty-six prose poems on love, work, freedom and death."],
  ["Stoner", "John Williams", "9781590171998", "Literary Fiction", "English", 278, 1965, "NYRB Classics", "The quiet, unremarkable life of a literature professor in the American Midwest."],
  ["Season of Migration to the North", "Tayeb Salih", "9780894770722", "Classics", "Arabic", 169, 1966, "Heinemann", "A man returns to Sudan and is haunted by another who went north."],
  ["The Diary of a Young Girl", "Anne Frank", "9780553296983", "Memoir", "English", 283, 1947, "Bantam", "Two years in hiding, recorded with extraordinary clarity and hope."],
  ["The Odyssey", "Homer", "9780140268867", "Classics", "English", 541, -700, "Penguin Classics", "A long voyage home, in Emily Wilson's clear-eyed translation."],
  ["Persuasion", "Jane Austen", "9780141439686", "Classics", "English", 249, 1817, "Penguin Classics", "Anne Elliot gets a second chance at the love she was persuaded to refuse."],
];

export const CURATED_BOOKS: CatalogueBook[] = CATALOGUE_SEED.map(
  ([title, author, isbn, genre, language, pageCount, publishedYear, publisher, description, series]) => ({
    title,
    author,
    isbn,
    genre,
    language,
    pageCount,
    publishedYear,
    publisher,
    description,
    series,
    coverUrl: shelfCover(isbn),
    externalRef: `openlibrary:${isbn}`,
  }),
);

export function coverFor(isbn?: string) {
  return shelfCover(isbn);
}

export function bookPayload(book: CatalogueBook): CatalogueBook {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    description: book.description,
    coverUrl: book.coverUrl,
    genre: book.genre,
    language: book.language,
    pageCount: book.pageCount,
    publisher: book.publisher,
    publishedYear: book.publishedYear,
    series: book.series,
    externalRef: book.externalRef,
    format: book.format,
  };
}

export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(value?: number | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDayKey(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function timeAgo(value: number) {
  const seconds = Math.max(1, Math.round((Date.now() - value) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function readingPercent(current?: number | null, total?: number | null) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round(((current ?? 0) / total) * 100));
}

export function formatMinutes(minutes: number) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const SPINE_COLORS = [
  { bg: "#5c6b4f", ink: "#f3ecd9" },
  { bg: "#8a5a3b", ink: "#f7ecda" },
  { bg: "#3f4f45", ink: "#eee7d5" },
  { bg: "#9c8256", ink: "#2c261c" },
  { bg: "#6e5a4b", ink: "#f6eddb" },
  { bg: "#7c6a45", ink: "#f6efdd" },
  { bg: "#4b5566", ink: "#f1ebdb" },
  { bg: "#a0704f", ink: "#fbf2e1" },
  { bg: "#6c7a5b", ink: "#f4eedb" },
  { bg: "#8d6b6b", ink: "#f8efdd" },
  { bg: "#57614f", ink: "#efe8d6" },
  { bg: "#7a6248", ink: "#f8efdd" },
  { bg: "#43514a", ink: "#f0e9d7" },
  { bg: "#967a5f", ink: "#2b241b" },
  { bg: "#d3c5a5", ink: "#3b3021" },
  { bg: "#383b38", ink: "#eee5d1" },
];

export function spinePalette(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 100000;
  }
  return SPINE_COLORS[hash % SPINE_COLORS.length];
}

export function coverPalette(key: string) {
  const palette = spinePalette(key);
  return {
    from: palette.bg,
    to: "#2f2a23",
    ink: palette.ink,
  };
}

/** Remote catalogue: Google Books volumes, normalised into our book shape. */
export type GoogleVolume = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
    language?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    seriesInfo?: { shortSeriesBookTitle?: string };
  };
};

export function fromGoogleVolume(volume: GoogleVolume): CatalogueBook & { rating?: number } {
  const info = volume.volumeInfo ?? {};
  const isbn = info.industryIdentifiers?.find((id) =>
    id.type.toUpperCase().includes("ISBN"),
  )?.identifier;
  const rawCover = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  return {
    title: info.title ?? "Untitled",
    author: info.authors?.join(", ") ?? "Unknown author",
    isbn,
    description: info.description,
    coverUrl: rawCover
      ? rawCover.replace("http://", "https://").replace("&edge=curl", "")
      : coverFor(isbn),
    genre: info.categories?.[0],
    language: info.language === "ml" ? "Malayalam" : info.language === "hi" ? "Hindi" : "English",
    pageCount: info.pageCount,
    publisher: info.publisher,
    publishedYear: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) || undefined : undefined,
    series: info.seriesInfo?.shortSeriesBookTitle,
    externalRef: `google:${volume.id}`,
    rating: info.averageRating,
  };
}

export const POPULAR_ISBNS = [
  "9780571258246",
  "9780006550686",
  "9781400033416",
  "9781455563937",
  "9780393356687",
  "9780375842207",
  "9780060883287",
  "9780141439549",
];

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return raw.trim() || "Something went wrong. Please try again.";
}

export function verdict(percentA: number, percentB: number) {
  if (percentA === percentB && percentA > 0) return "Neck and neck";
  return percentA > percentB ? "Reader one ahead" : "Reader two ahead";
}
