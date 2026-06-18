export const slugifyArticle = (value) => value
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[\u064B-\u065F]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '')

/**
 * Generates bilingual article draft content from course metadata (client-side AI agent).
 */
export const generateArticleDraft = ({
  course,
  courses = [],
  titleHint = '',
  promptNotes = '',
  category = ''
}) => {
  const coursePool = course ? [course] : courses.slice(0, 4)
  const primary = coursePool[0]
  const titles = coursePool.map((item) => item.title).filter(Boolean).join('، ')
  const resolvedCategory = primary?.category || category || 'education'

  const title = titleHint?.trim() || (primary
    ? `كيف تبدأ رحلتك في ${primary.title} مع BeePro Academy`
    : 'كيف تختار مسارك التعليمي القادم مع BeePro Academy')

  const promptBlock = promptNotes?.trim()
    ? `\n\n${promptNotes.trim()}`
    : ''

  const arabicBody = [
    `اختيار المسار التعليمي المناسب يبدأ من فهم الهدف العملي من التعلم. في BeePro Academy نربط المحتوى بالممارسة حتى يتحول كل درس إلى خطوة قابلة للتطبيق.`,
    primary
      ? `كورس ${primary.title} يقدم مدخلاً منظماً للمهارات الأساسية، مع شرح يناسب مستوى ${primary.level || 'المتعلم'} ويمنح الطالب تصوراً واضحاً لما سيبنيه خلال الرحلة.`
      : `تضم المنصة كورسات متعددة مثل ${titles || 'الأسواق المالية والبرمجة وتقنية المعلومات'}، وهذا يساعد الطالب على الانتقال من الفضول إلى خطة تعلم واضحة.`,
    `قبل التسجيل، حدد المشكلة التي تريد حلها: هل تريد تطوير مهارة مهنية، فهم سوق معين، أو بناء مشروع تطبيقي؟ الإجابة ستجعل اختيار الكورس أسهل وتزيد من استفادتك.`,
    `ننصح بأن تبدأ بالمفاهيم الأساسية، ثم تنتقل إلى التمارين، وبعدها توثق ما تعلمته في مشروع صغير أو ملخص عملي. هذا الأسلوب يجعل التعلم أعمق وأكثر ثباتاً.${promptBlock}`
  ].join('\n\n')

  const englishBody = [
    'Choosing the right learning path starts with understanding the practical outcome you want. BeePro Academy connects course content with applied practice so every lesson becomes a usable step.',
    primary
      ? `${primary.title} gives learners a structured way into the core skills, with a path that suits the ${primary.level || 'learner'} level and clarifies what they will build over time.`
      : `The platform includes courses such as ${titles || 'financial markets, data analysis, and IT'}, helping learners turn curiosity into a clear plan.`,
    'Before enrolling, define the problem you want to solve: a professional skill, a market you want to understand, or a practical project you want to build.',
    `Start with fundamentals, move into practice, then document what you learned in a small project or applied summary. This makes learning deeper and easier to retain.${promptBlock}`
  ].join('\n\n')

  return {
    title,
    title_en: primary
      ? `How to Start Learning ${primary.titleEn || primary.title}`
      : 'How to Choose Your Next Learning Path',
    slug: slugifyArticle(title),
    excerpt: 'دليل مختصر يساعد الطالب على اختيار الكورس المناسب وتحويل التعلم إلى خطوات عملية.',
    excerpt_en: 'A concise guide for choosing the right course and turning learning into practical steps.',
    content: arabicBody,
    content_en: englishBody,
    category: resolvedCategory,
    course_id: primary?.id || null,
    cover_image_url: primary?.thumbnail || primary?.thumbnail_url || primary?.image || '/assets/hero-background.png',
    status: 'draft'
  }
}
