import { api } from "@/convex/_generated/api";
import {
  Avatar,
  BookCover,
  PageHeader,
  SectionHeading,
  Stars,
} from "@/components/bookverse/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, formatDate, formatMinutes, readingPercent } from "@/lib/bookverse";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  Check,
  Flame,
  ImagePlus,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

type Person = NonNullable<ReturnType<typeof useProfilesData>>["people"][number];

function useProfilesData() {
  return useQuery(api.profiles.overview);
}

export default function Profiles() {
  const data = useProfilesData();
  const { signOut, readerSlot } = useAuth();
  const navigate = useNavigate();
  const renameLibrary = useMutation(api.households.renameLibrary);
  const changeMyPin = useAction(api.pinAuth.changeMyPin);
  const ownerResetPin = useAction(api.pinAuth.ownerResetPin);
  const [editing, setEditing] = useState<Person | null>(null);
  const [libraryName, setLibraryName] = useState("");
  const [nameOpen, setNameOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"change" | "reset" | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  if (!data) {
    return <div className="h-80 animate-pulse rounded-lg bg-secondary/60" />;
  }

  const me = data.people.find((person) => person.isMe);
  const partner = data.people.find((person) => !person.isMe);
  const isRoomOwner = readerSlot === "whiskeyy";

  const openPinDialog = (mode: "change" | "reset") => {
    setPinMode(mode);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setPinError(null);
  };

  const savePin = async () => {
    if (newPin.length !== 6) {
      setPinError("Choose a new six-digit PIN.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("The two new PINs do not match.");
      return;
    }
    setPinBusy(true);
    setPinError(null);
    try {
      if (pinMode === "change") {
        await changeMyPin({ currentPin, newPin });
        toast.success("Your room PIN has been changed.");
      } else if (pinMode === "reset") {
        await ownerResetPin({ slot: "matildaa", newPin });
        toast.success(`${partner?.displayName ?? "Matildaa"}'s PIN has been reset.`);
      }
      setPinMode(null);
    } catch (error) {
      setPinError(errorMessage(error));
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="space-y-10 pb-6">
      <PageHeader
        eyebrow="Profiles"
        title="The two readers."
        description="One household, two identities. Each reader controls their own name, photograph, bio, preferences and private documents. Reading records stay separate; the shelf is shared."
      />

      <section className="grid gap-5 md:grid-cols-2">
        {data.people.map((person, index) => (
          <article key={person.userId} className="paper-card rounded-lg p-5">
            <div className="flex items-start gap-4">
              <Avatar
                name={person.displayName}
                src={person.avatarUrl}
                tone={index === 0 ? "olive" : "terracotta"}
                className="size-16 text-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="label-caps">{index === 0 ? "Reader one" : "Reader two"}</p>
                  {person.isMe ? (
                    <span className="rounded-full border border-forest/25 bg-olive/12 px-2 py-0.5 text-[0.55rem] tracking-[0.12em] text-forest uppercase">
                      you
                    </span>
                  ) : null}
                </div>
                <h2 className="font-display mt-1 text-[1.7rem] leading-tight">
                  {person.displayName}
                </h2>
                <p className="mt-1.5 text-[0.78rem] leading-relaxed text-muted-foreground">
                  {person.bio || "No bio written yet."}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {person.favoriteGenres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-[0.6rem] text-muted-foreground"
                    >
                      {genre}
                    </span>
                  ))}
                  {person.languages.map((language) => (
                    <span
                      key={language}
                      className="rounded-full border border-olive/25 bg-olive/8 px-2 py-0.5 text-[0.6rem] text-forest"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="rule my-4" />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[0.72rem] sm:grid-cols-4">
              {[
                ["Books", person.stats.booksCompleted],
                ["Pages", person.stats.pagesRead.toLocaleString()],
                ["Streak", `${person.stats.currentStreak}d`],
                ["Best", `${person.stats.bestStreak}d`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.58rem] tracking-[0.12em] text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="font-display mt-0.5 text-lg leading-none">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.66rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3 text-terracotta" /> {person.stats.weekDays}/7 days
                this week
              </span>
              <span>{formatMinutes(person.stats.minutesRead)} read</span>
              <span className="inline-flex items-center gap-1">
                <Stars value={person.stats.averageRating ?? 0} size={11} />
                {person.stats.averageRating ?? "—"}
              </span>
            </div>
            {person.isMe ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full rounded-full border-forest/25"
                onClick={() => setEditing(person)}
              >
                <Pencil className="mr-2 size-3.5" /> Edit my profile
              </Button>
            ) : null}
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {data.people.map((person) => (
          <div key={person.userId} className="space-y-5">
            {person.privateActivity ? (
              <p className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-[0.72rem] leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-olive" />
                {person.displayName} keeps their reading activity private. Shared household
                totals still include their pages, but their lists and timeline stay hidden.
              </p>
            ) : null}
            <SectionHeading
              eyebrow="On the nightstand"
              title={`${person.displayName} is reading`}
              description={`${person.reading.length} open book${person.reading.length === 1 ? "" : "s"}`}
            />
            {person.reading.length ? (
              <div className="space-y-2.5">
                {person.reading.map(({ record, book }) => (
                  <Link
                    key={record._id}
                    to={book ? `/book/${book._id}` : "/home"}
                    className="paper-card flex items-center gap-3 rounded-md p-2.5 transition hover:border-olive/40"
                  >
                    <BookCover
                      title={book?.title ?? "Untitled"}
                      author={book?.author}
                      coverUrl={book?.coverUrl}
                      className="w-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-[0.95rem]">{book?.title}</p>
                      <p className="truncate text-[0.66rem] text-muted-foreground">
                        {book?.author} · {record.source === "digital" ? "PDF" : "Print"}
                      </p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-olive"
                          style={{
                            width: `${readingPercent(record.currentPage, book?.pageCount)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="font-display text-sm text-muted-foreground">
                      {readingPercent(record.currentPage, book?.pageCount)}%
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="paper-panel rounded-md px-4 py-5 text-[0.78rem] text-muted-foreground">
                {person.privateActivity
                  ? "This reader keeps their current reading private."
                  : "Nothing open at the moment."}
              </p>
            )}

            <SectionHeading
              eyebrow="Finished"
              title="Completed books"
              description={`${person.finished.length} on the shared shelf`}
            />
            {person.finished.length ? (
              <div className="paper-panel rounded-md p-3.5">
                <div className="flex flex-wrap gap-2">
                  {person.finished.slice(0, 10).map(({ record, book }) => (
                    <Link
                      key={record._id}
                      to={book ? `/book/${book._id}` : "/shelf"}
                      className="w-14 shrink-0 transition hover:-translate-y-0.5"
                      title={`${book?.title} · ${formatDate(record.completionDate)}`}
                    >
                      <BookCover
                        title={book?.title ?? "Untitled"}
                        author={book?.author}
                        coverUrl={book?.coverUrl}
                      />
                    </Link>
                  ))}
                </div>
                {person.finished.length > 10 ? (
                  <p className="mt-2 text-[0.66rem] text-muted-foreground">
                    +{person.finished.length - 10} more on Our Shelf
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="paper-panel rounded-md px-4 py-5 text-[0.78rem] text-muted-foreground">
                {person.privateActivity
                  ? "Finished books are hidden while activity sharing is off."
                  : "No finished books yet — the first spine is waiting."}
              </p>
            )}

            <SectionHeading
              eyebrow="Wishing for"
              title="Wishlist"
              description={`${person.wishlist.length} book${person.wishlist.length === 1 ? "" : "s"} saved`}
            />
            {person.wishlist.length ? (
              <ul className="space-y-1.5">
                {person.wishlist.slice(0, 5).map(({ item, book }) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-3 border-b border-border/50 pb-1.5 text-[0.76rem] last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-display">{book?.title}</span>
                      <span className="text-muted-foreground"> · {book?.author}</span>
                    </span>
                    <span className="shrink-0 text-[0.6rem] tracking-[0.1em] text-muted-foreground uppercase">
                      {item.priority}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.76rem] text-muted-foreground">
                {person.privateActivity
                  ? "This reader's wishlist is hidden."
                  : "No wishes saved yet."}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="paper-card rounded-lg p-5">
          <SectionHeading
            eyebrow="Membership"
            title="Your shared household"
            description={`${data.household.name} · ${data.household.memberCount} of 2 readers`}
          />
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-forest/20 bg-olive/8 px-3 py-2.5 text-[0.72rem] leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 text-foreground">
                <KeyRound className="size-3.5 text-olive" /> Two PIN-protected doors
              </p>
              <p className="mt-1">
                This room is fixed to two readers. Each person enters through their own
                six-digit PIN, and nobody can see anyone else&apos;s key.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-[0.72rem]"
                onClick={() => openPinDialog("change")}
              >
                <KeyRound className="mr-2 size-3.5" /> Change my PIN
              </Button>
              {isRoomOwner && partner ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-[0.72rem]"
                  onClick={() => openPinDialog("reset")}
                >
                  <ShieldCheck className="mr-2 size-3.5" /> Reset {partner.displayName}&apos;s PIN
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-[0.72rem]"
                onClick={() => {
                  setLibraryName(data.household.name);
                  setNameOpen(true);
                }}
              >
                <Pencil className="mr-2 size-3.5" /> Rename library
              </Button>
            </div>
            <div className="rounded-md border border-border/70 bg-background/60 px-3 py-2.5 text-[0.7rem] leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 text-foreground">
                <Lock className="size-3.5 text-olive" /> Privacy summary
              </p>
              <p className="mt-1">
                {me?.displayName ?? "You"} can see shared documents, shared book records and
                the household shelf. Private PDFs, private notes and each reader&apos;s PIN
                are never exposed to the other reader or to any public page.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="paper-card rounded-lg p-5">
            <SectionHeading eyebrow="Account" title="Sign-in & identity" />
            <dl className="mt-3 space-y-2 text-[0.76rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reader</dt>
                <dd>{me?.displayName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Access</dt>
                <dd className="inline-flex items-center gap-1.5">
                  <KeyRound className="size-3 text-olive" />
                  Six-digit PIN
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Partner</dt>
                <dd>{partner?.displayName ?? "Matildaa"}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut className="mr-2 size-3.5" /> Sign out
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => openPinDialog("change")}
              >
                <KeyRound className="mr-2 size-3.5" /> Change PIN
              </Button>
            </div>
          </div>
        </div>
      </section>

      <EditProfileDialog
        person={editing}
        onClose={() => setEditing(null)}
      />

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Rename your library</DialogTitle>
            <DialogDescription>
              This appears in the header and on your profiles.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={libraryName}
            onChange={(event) => setLibraryName(event.target.value)}
            maxLength={80}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNameOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-forest text-primary-foreground"
              onClick={async () => {
                try {
                  await renameLibrary({ name: libraryName });
                  toast.success("Library renamed.");
                  setNameOpen(false);
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              Save name
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pinMode)} onOpenChange={(open) => !open && setPinMode(null)}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <p className="label-caps">Room keys</p>
            <DialogTitle className="font-display text-2xl">
              {pinMode === "reset"
                ? `Reset ${partner?.displayName ?? "Matildaa"}'s PIN`
                : "Change my PIN"}
            </DialogTitle>
            <DialogDescription>
              {pinMode === "reset"
                ? "Set a fresh six-digit PIN for your partner. Their existing PIN is never shown, and their other sessions are closed."
                : "Enter your current PIN, then choose a new six-digit PIN. Nobody can read the PIN you already have."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {pinMode === "change" ? (
              <div className="space-y-1.5">
                <Label className="label-caps">Current PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(event) => {
                    setPinError(null);
                    setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                  className="text-center font-mono tracking-[0.35em]"
                  autoComplete="off"
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="label-caps">New PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(event) => {
                    setPinError(null);
                    setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                  className="text-center font-mono tracking-[0.28em]"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="label-caps">Repeat PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(event) => {
                    setPinError(null);
                    setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  }}
                  className="text-center font-mono tracking-[0.28em]"
                  autoComplete="off"
                />
              </div>
            </div>
            {pinError ? (
              <p className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[0.68rem] leading-relaxed text-destructive">
                {pinError}
              </p>
            ) : null}
            <p className="flex items-start gap-2 text-[0.64rem] leading-relaxed text-muted-foreground">
              <Lock className="mt-0.5 size-3 shrink-0 text-olive" />
              PINs are stored as salted PBKDF2 hashes. The room never reveals an existing
              PIN.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPinMode(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-forest text-primary-foreground"
              disabled={
                pinBusy ||
                newPin.length !== 6 ||
                confirmPin.length !== 6 ||
                (pinMode === "change" && currentPin.length !== 6)
              }
              onClick={savePin}
            >
              {pinBusy ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-3.5" />
              )}
              Save PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditProfileDialog({
  person,
  onClose,
}: {
  person: Person | null;
  onClose: () => void;
}) {
  const updateProfile = useMutation(api.profiles.updateProfile);
  const saveAvatar = useMutation(api.households.saveAvatar);
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(person?.displayName ?? "");
  const [bio, setBio] = useState(person?.bio ?? "");
  const [genres, setGenres] = useState((person?.favoriteGenres ?? []).join(", "));
  const [languages, setLanguages] = useState((person?.languages ?? []).join(", "));
  const [shareActivity, setShareActivity] = useState(person?.shareActivity ?? true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Re-seed the form whenever a new person is opened.
  const [lastId, setLastId] = useState(person?.userId);
  if (person && person.userId !== lastId) {
    setLastId(person.userId);
    setDisplayName(person.displayName);
    setBio(person.bio);
    setGenres(person.favoriteGenres.join(", "));
    setLanguages(person.languages.join(", "));
    setShareActivity(person.shareActivity);
  }

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Profile photos must be under 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await generateUploadUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("The image upload failed.");
      const { storageId } = (await response.json()) as {
        storageId: Parameters<typeof saveAvatar>[0]["storageId"];
      };
      await saveAvatar({ storageId });
      toast.success("Profile photograph updated.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={Boolean(person)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-card sm:max-w-md">
        <DialogHeader>
          <p className="label-caps">Reader identity</p>
          <DialogTitle className="font-display text-2xl">Edit my profile</DialogTitle>
          <DialogDescription>
            Only you can change these details. Your partner sees the display name, bio and
            public reading activity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-4">
            <Avatar
              name={displayName || "Reader"}
              src={person?.avatarUrl}
              className="size-14"
            />
            <div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 size-3.5" />
                )}
                Upload photo
              </Button>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                JPG or PNG, under 4 MB.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
                event.target.value = "";
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-caps">Display name</Label>
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-caps">Short bio</Label>
            <Textarea
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={600}
              placeholder="A line or two about your reading life."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="label-caps">Favourite genres</Label>
            <Input
              value={genres}
              onChange={(event) => setGenres(event.target.value)}
              placeholder="Classics, Poetry, Memoir"
            />
            <p className="text-[0.65rem] text-muted-foreground">Separate with commas.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="label-caps">Preferred languages</Label>
            <Input
              value={languages}
              onChange={(event) => setLanguages(event.target.value)}
              placeholder="English, Malayalam"
            />
          </div>
          <label className="flex items-start justify-between gap-4 rounded-md border border-border/70 bg-background/50 px-3 py-2.5">
            <span>
              <span className="block text-[0.8rem]">Share reading activity</span>
              <span className="mt-0.5 block text-[0.66rem] text-muted-foreground">
                When off, your progress still counts toward shared statistics but your
                profile card is marked private. PDF privacy is separate and always enforced.
              </span>
            </span>
            <Switch checked={shareActivity} onCheckedChange={setShareActivity} />
          </label>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="rounded-full bg-forest text-primary-foreground"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await updateProfile({
                  displayName,
                  bio,
                  favoriteGenres: genres.split(",").map((genre) => genre.trim()).filter(Boolean),
                  languages: languages.split(",").map((language) => language.trim()).filter(Boolean),
                  shareActivity,
                });
                toast.success("Profile saved.");
                onClose();
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Save profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
