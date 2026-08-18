import type { Instructor, LearningContent, Level, Topic } from "@/types/content"

export const topics: Topic[] = [
  {
    id: "topic-web",
    slug: "web",
    name: { en: "Web Development", ar: "تطوير الويب" },
  },
  {
    id: "topic-backend",
    slug: "backend",
    name: { en: "Backend", ar: "تطوير الخوادم" },
  },
  {
    id: "topic-git",
    slug: "git",
    name: { en: "Git & Collaboration", ar: "جِت والعمل الجماعي" },
  },
  { id: "topic-data", slug: "data", name: { en: "Data", ar: "البيانات" } },
]

export const levels: Level[] = [
  {
    id: "level-start",
    slug: "getting-started",
    name: { en: "Getting started", ar: "تمهيدي" },
  },
  { id: "level-build", slug: "builder", name: { en: "Builder", ar: "تطبيقي" } },
  {
    id: "level-deep",
    slug: "deep-dive",
    name: { en: "Deep dive", ar: "متقدم" },
  },
]

const instructors: Instructor[] = [
  {
    id: "instructor-sara",
    name: { en: "Sara Alharbi", ar: "سارة الحربي" },
    bio: {
      en: "Software engineering student focused on accessible web experiences.",
      ar: "طالبة هندسة برمجيات مهتمة بتجارب الويب السهلة والمتاحة للجميع.",
    },
    initials: "SA",
  },
  {
    id: "instructor-omar",
    name: { en: "Omar Basalamah", ar: "عمر باسلامة" },
    bio: {
      en: "Backend developer and KStack contributor who enjoys teaching systems thinking.",
      ar: "مطور خوادم ومساهم في كي ستاك يهتم بتبسيط التفكير في الأنظمة.",
    },
    initials: "OB",
  },
]

const lesson = (
  id: string,
  slug: string,
  position: number,
  en: string,
  ar: string,
  durationSeconds: number
) => ({
  id,
  slug,
  position,
  title: { en, ar },
  media: {
    id: `media-${id}`,
    status: "READY" as const,
    durationSeconds,
    provider: "LOCAL" as const,
    captions: [],
  },
})

export const mockContent: LearningContent[] = [
  {
    id: "content-web-foundations",
    slug: "web-foundations",
    kind: "SERIES",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: { en: "Web Foundations", ar: "أساسيات الويب" },
    summary: {
      en: "Build a responsive website from the first semantic element to deployment.",
      ar: "ابنِ موقعاً متجاوباً من أول عنصر دلالي وحتى النشر.",
    },
    description: {
      en: "A practical path through HTML, modern CSS, responsive layouts, accessibility, and the browser tools you will use every day.",
      ar: "مسار عملي يمر على HTML وCSS الحديثة والتصميم المتجاوب وإمكانية الوصول وأدوات المتصفح التي ستستخدمها يومياً.",
    },
    spokenLanguage: "AR",
    level: levels[0],
    topics: [topics[0]],
    instructors: [instructors[0]],
    units: [
      lesson(
        "html",
        "semantic-html",
        1,
        "Semantic HTML",
        "HTML الدلالية",
        2560
      ),
      lesson("css", "modern-css", 2, "Modern CSS", "CSS الحديثة", 3120),
      lesson(
        "responsive",
        "responsive-layouts",
        3,
        "Responsive layouts",
        "التصميم المتجاوب",
        2840
      ),
      lesson(
        "a11y",
        "accessibility",
        4,
        "Accessibility that matters",
        "إمكانية الوصول",
        2280
      ),
    ],
    featuredRank: 1,
    publishedAt: "2026-08-04T09:00:00Z",
    views: 1840,
    watchedMinutes: 27600,
  },
  {
    id: "content-spring",
    slug: "spring-boot-from-zero",
    kind: "SERIES",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: { en: "Spring Boot from Zero", ar: "سبرينغ بوت من الصفر" },
    summary: {
      en: "Understand the KStacks backend pattern by building a clean production API.",
      ar: "افهم نمط خوادم كي ستاك من خلال بناء API نظيف وجاهز للإنتاج.",
    },
    description: {
      en: "Follow a request from controller to service, repository, PostgreSQL, validation, testing, and container health checks.",
      ar: "تتبّع الطلب من المتحكم إلى الخدمة والمستودع وPostgreSQL والتحقق والاختبارات وفحوصات الحاوية.",
    },
    spokenLanguage: "MIXED",
    level: levels[1],
    topics: [topics[1]],
    instructors: [instructors[1]],
    units: [
      lesson(
        "spring-mental",
        "spring-mental-model",
        1,
        "The Spring mental model",
        "النموذج الذهني لسبرينغ",
        3480
      ),
      lesson(
        "spring-api",
        "rest-api",
        2,
        "Designing the REST API",
        "تصميم REST API",
        4020
      ),
      lesson(
        "spring-data",
        "postgres-and-jpa",
        3,
        "PostgreSQL and JPA",
        "PostgreSQL وJPA",
        4380
      ),
    ],
    featuredRank: 2,
    publishedAt: "2026-08-02T11:30:00Z",
    views: 1315,
    watchedMinutes: 20420,
  },
  {
    id: "content-git",
    slug: "git-without-fear",
    kind: "COURSE",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: { en: "Git Without Fear", ar: "جِت بدون خوف" },
    summary: {
      en: "Branches, pull requests, conflicts, and recovery explained visually.",
      ar: "شرح مرئي للفروع وطلبات الدمج والتعارضات واستعادة العمل.",
    },
    description: {
      en: "A single focused course for confidently contributing to a shared repository without memorizing mysterious commands.",
      ar: "دورة مركزة تساعدك على المساهمة بثقة في مستودع مشترك دون حفظ أوامر غامضة.",
    },
    spokenLanguage: "AR",
    level: levels[0],
    topics: [topics[2]],
    instructors: [instructors[0], instructors[1]],
    units: [
      lesson(
        "git-course",
        "full-course",
        1,
        "Full course",
        "الدورة الكاملة",
        6540
      ),
    ],
    featuredRank: 3,
    publishedAt: "2026-07-29T15:00:00Z",
    views: 2980,
    watchedMinutes: 48210,
  },
  {
    id: "content-sql",
    slug: "sql-for-builders",
    kind: "COURSE",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: { en: "SQL for Builders", ar: "SQL للمطورين" },
    summary: {
      en: "Go from tables and joins to indexes and transactions in one practical course.",
      ar: "انتقل من الجداول والربط إلى الفهارس والمعاملات في دورة عملية واحدة.",
    },
    description: {
      en: "Work through a real catalog database and learn the SQL decisions that application frameworks cannot make for you.",
      ar: "طبّق على قاعدة بيانات حقيقية وتعلّم قرارات SQL التي لا تستطيع أطر العمل اتخاذها بالنيابة عنك.",
    },
    spokenLanguage: "EN",
    level: levels[1],
    topics: [topics[1], topics[3]],
    instructors: [instructors[1]],
    units: [
      lesson(
        "sql-course",
        "full-course",
        1,
        "Full course",
        "الدورة الكاملة",
        7260
      ),
    ],
    featuredRank: 4,
    publishedAt: "2026-07-25T08:30:00Z",
    views: 1140,
    watchedMinutes: 18740,
  },
  {
    id: "content-react",
    slug: "react-thinking",
    kind: "SERIES",
    status: "PUBLISHED",
    visibility: "PUBLIC",
    title: { en: "Thinking in React", ar: "التفكير باستخدام React" },
    summary: {
      en: "Components, state, server data, and accessible composition without cargo cults.",
      ar: "المكونات والحالة وبيانات الخادم والتركيب المتاح دون نسخ عشوائي.",
    },
    description: {
      en: "Learn how to choose component boundaries and data ownership before reaching for more libraries.",
      ar: "تعلّم اختيار حدود المكونات وملكية البيانات قبل إضافة المزيد من المكتبات.",
    },
    spokenLanguage: "MIXED",
    level: levels[1],
    topics: [topics[0]],
    instructors: [instructors[0]],
    units: [
      lesson(
        "react-components",
        "components",
        1,
        "Component boundaries",
        "حدود المكونات",
        2860
      ),
      lesson(
        "react-state",
        "state",
        2,
        "State ownership",
        "ملكية الحالة",
        2640
      ),
      lesson(
        "react-server",
        "server-state",
        3,
        "Server state",
        "بيانات الخادم",
        3080
      ),
    ],
    publishedAt: "2026-07-20T13:00:00Z",
    views: 1640,
    watchedMinutes: 22940,
  },
  {
    id: "content-docker",
    slug: "containers-clearly",
    kind: "COURSE",
    status: "DRAFT",
    visibility: "PUBLIC",
    title: { en: "Containers, Clearly", ar: "الحاويات ببساطة" },
    summary: {
      en: "A practical mental model for images, containers, networks, and production configuration.",
      ar: "نموذج ذهني عملي للصور والحاويات والشبكات وإعدادات الإنتاج.",
    },
    description: {
      en: "Build and inspect a real service container, then understand what Kubernetes adds on top.",
      ar: "ابنِ حاوية خدمة حقيقية وافحصها، ثم افهم ما الذي تضيفه Kubernetes.",
    },
    spokenLanguage: "AR",
    level: levels[0],
    topics: [topics[1]],
    instructors: [instructors[1]],
    units: [
      lesson(
        "docker-course",
        "full-course",
        1,
        "Full course",
        "الدورة الكاملة",
        5940
      ),
    ],
    views: 0,
    watchedMinutes: 0,
  },
]
