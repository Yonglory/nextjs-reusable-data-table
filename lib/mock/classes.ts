export type ClassStatus = "Scheduled" | "Full" | "Cancelled";
export type PaymentType = "One-time" | "Package" | "Membership";
export type BookingStatus = "Booked" | "Checked-in" | "Cancelled" | "No-show";

export type Attendee = {
  id: string;
  customerName: string;
  paymentType: PaymentType;
  bookingStatus: BookingStatus;
};

export type StudioClass = {
  id: string;
  name: string;
  room: string;
  day: string;
  instructor: string;
  timeLabel: string;
  startMinutes: number;
  booked: number;
  capacity: number;
  status: ClassStatus;
  attendees?: Attendee[];
};

export const classStatusRank: Record<ClassStatus, number> = {
  Scheduled: 0,
  Full: 1,
  Cancelled: 2,
};

const classNames = [
  "Yoga Flow",
  "HIIT Blast",
  "Reformer Pilates",
  "Spin",
  "Barre",
  "Boxing",
  "Mobility",
  "Prenatal Yoga",
  "Strength",
  "Meditation",
  "Cycle & Core",
  "Mat Pilates",
];

const instructors = [
  "John Doe",
  "Maya Chen",
  "Luis Ortega",
  "Ava Patel",
  "Noah Kim",
  "Sofia Rossi",
  "Ethan Brooks",
  "Priya Shah",
  "Liam Carter",
  "Nora Ibrahim",
  "Owen Blake",
  "Hana Suzuki",
];

const rooms = ["Studio A", "Studio B", "Cycle loft", "Reformer room", "Rooftop"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const firstNames = [
  "Amina",
  "Ben",
  "Chloe",
  "Diego",
  "Elena",
  "Farah",
  "George",
  "Hannah",
  "Ivan",
  "Jules",
  "Kai",
  "Leila",
  "Marco",
  "Nina",
  "Omar",
  "Paige",
  "Quinn",
  "Rosa",
  "Samir",
  "Thea",
];
const lastNames = [
  "Adler",
  "Bennett",
  "Cho",
  "Diaz",
  "Ellis",
  "Foster",
  "Garcia",
  "Hughes",
  "Ibrahim",
  "Jensen",
  "Khan",
  "Lopez",
  "Murphy",
  "Nguyen",
  "Owens",
  "Park",
  "Reed",
  "Santos",
  "Turner",
  "Walsh",
];
const payments: PaymentType[] = ["One-time", "Package", "Membership"];
const bookings: BookingStatus[] = ["Booked", "Checked-in", "Cancelled", "No-show"];

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function formatClock(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

function buildAttendees(
  classId: string,
  count: number,
  cancelledClass: boolean,
  random: () => number,
): Attendee[] {
  const attendees: Attendee[] = [];
  for (let index = 0; index < count; index += 1) {
    const first = firstNames[Math.floor(random() * firstNames.length)] ?? "Alex";
    const last = lastNames[Math.floor(random() * lastNames.length)] ?? "Stone";
    attendees.push({
      id: `${classId}-a${index + 1}`,
      customerName: `${first} ${last}`,
      paymentType: payments[index % payments.length] ?? "One-time",
      bookingStatus: cancelledClass
        ? "Cancelled"
        : (bookings[Math.floor(random() * bookings.length)] ?? "Booked"),
    });
  }
  return attendees;
}

function buildClasses(): StudioClass[] {
  const random = createRng(20261115);
  const classes: StudioClass[] = [];

  for (let index = 0; index < 240; index += 1) {
    const id = `cls-${(index + 1).toString().padStart(3, "0")}`;
    const startMinutes = index === 0 ? 10 * 60 : 6 * 60 + (index % 14) * 60;
    const duration = index % 4 === 0 ? 45 : 60;
    const capacity = index === 0 ? 15 : 12 + (index % 9);
    const cancelled = index !== 0 && index % 13 === 0;
    const empty = index !== 0 && index % 17 === 0;
    let booked = 0;
    if (!empty) {
      if (index === 0) booked = 12;
      else if (index % 5 === 0) booked = capacity;
      else booked = 1 + Math.floor(random() * capacity);
    }
    if (booked > capacity) booked = capacity;

    let status: ClassStatus = "Scheduled";
    if (cancelled) status = "Cancelled";
    else if (booked >= capacity) status = "Full";

    classes.push({
      id,
      name: index === 0 ? "Yoga Flow" : (classNames[index % classNames.length] ?? "Yoga Flow"),
      room: index === 0 ? "Studio A" : (rooms[index % rooms.length] ?? "Studio A"),
      day: days[index % days.length] ?? "Mon",
      instructor: index === 0 ? "John Doe" : (instructors[index % instructors.length] ?? "John Doe"),
      timeLabel: `${formatClock(startMinutes)} – ${formatClock(startMinutes + duration)}`,
      startMinutes,
      booked,
      capacity,
      status,
      attendees: buildAttendees(id, booked, status === "Cancelled", random),
    });
  }

  return classes;
}

const classes = buildClasses();

export function getClasses(includeAttendees: boolean): StudioClass[] {
  if (includeAttendees) return classes;
  return classes.map((studioClass) => {
    const rest = { ...studioClass };
    delete rest.attendees;
    return rest;
  });
}

export function getAttendees(classId: string): Attendee[] | null {
  const studioClass = classes.find((item) => item.id === classId);
  if (!studioClass) return null;
  return studioClass.attendees ?? [];
}
