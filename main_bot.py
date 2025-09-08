import logging
import os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from groq import Groq, APIError

# --- الإعدادات الأساسية ---
# لا تضع التوكنات هنا مباشرة في الكود النهائي، استخدم متغيرات البيئة
TELEGRAM_TOKEN = "YOUR_TELEGRAM_TOKEN"  #  <-- ضع توكن بوت التليجرام هنا
GROQ_API_KEY = "YOUR_GROQ_API_KEY"      #  <-- ضع مفتاح Groq API هنا

# إعداد تسجيل الأحداث (Logs) لمعرفة ما يحدث في البوت
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# إعداد عميل Groq
try:
    groq_client = Groq(api_key=GROQ_API_KEY)
    logger.info("تم إعداد عميل Groq بنجاح.")
except Exception as e:
    groq_client = None
    logger.error(f"فشل في إعداد عميل Groq: {e}")

# --- دوال الذكاء الاصطناعي (التي بنيناها سابقًا) ---

async def classify_user_intent_groq(user_query: str) -> str:
    """
    تستخدم Groq API لتحديد نية المستخدم بسرعة فائقة.
    """
    if not groq_client:
        logger.error("عميل Groq غير مُهيأ. العودة إلى المنطق الاحتياطي.")
        # خطة طوارئ بسيطة في حال فشل الاتصال
        if any(word in user_query for word in ["مشكلة", "عطل", "ما يشتغل"]):
            return 'problem_report'
        if any(word in user_query for word in ["اريد", "أريد", "احسن", "افضل", "برنامج لـ"]):
            return 'app_recommendation'
        return 'app_search'

    system_prompt = """
    أنت خبير في تحليل اللغة الطبيعية باللهجة العراقية. مهمتك هي تصنيف رسالة المستخدم إلى واحدة من الفئات التالية فقط:
    - 'app_search': إذا كان المستخدم يبحث عن تطبيق معين باسمه.
    - 'app_recommendation': إذا كان المستخدم يطلب توصية لتطبيق يؤدي وظيفة ما.
    - 'greeting_or_chat': إذا كانت الرسالة مجرد تحية، شكر، أو سؤال عام.
    - 'problem_report': إذا كان المستخدم يبلغ عن مشكلة.
    أجب بكلمة واحدة فقط تمثل الفئة. لا تكتب أي شيء آخر.
    """
        
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_query}
            ],
            model="llama3-8b-8192",
            temperature=0.0,
        )
        response = chat_completion.choices[0].message.content.strip().lower().replace("'", "")
            
        valid_intents = ['app_search', 'app_recommendation', 'greeting_or_chat', 'problem_report']
        if response in valid_intents:
            logger.info(f"Groq classified intent for '{user_query}' as: '{response}'")
            return response
        else:
            logger.warning(f"Groq gave an unexpected classification: '{response}'. Defaulting to 'app_search'.")
            return 'app_search'
                
    except APIError as e:
        logger.error(f"Groq API call failed: {e}. Using fallback logic.")
        # نفس الخطة الاحتياطية
        if any(word in user_query for word in ["مشكلة", "عطل", "ما يشتغل"]):
            return 'problem_report'
        if any(word in user_query for word in ["اريد", "أريد", "احسن", "افضل", "برنامج لـ"]):
            return 'app_recommendation'
        return 'app_search'

# --- دوال معالجة النوايا ---

async def handle_app_search(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """يعالج طلبات البحث عن تطبيق محدد بالاسم."""
    # TODO: هنا ستضيف لاحقًا كود البحث في قاعدة بياناتك
    await update.message.reply_text(f"فهمت، أنت تبحث عن تطبيق اسمه '{update.message.text}'. سأبحث لك في قاعدة البيانات.")

async def handle_app_recommendation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """يعالج طلبات التوصية بتطبيقات."""
    # TODO: هنا ستستخدم الـ AI لاستخراج الكلمات المفتاحية ثم البحث
    await update.message.reply_text("فهمت، أنت تريد توصية لتطبيق. سأحلل طلبك وأبحث عن أفضل الخيارات.")

async def handle_greeting_or_chat(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """يعالج التحيات والأسئلة العامة."""
    await update.message.reply_text("أهلاً بك! أنا مساعدك الذكي للعثور على التطبيقات. كيف أقدر أساعدك؟")

async def handle_problem_report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """يعالج الإبلاغ عن المشاكل."""
    await update.message.reply_text("شكرًا لإبلاغنا بالمشكلة. تم تسجيلها وسيتم مراجعتها.")

# --- المعالج الرئيسي للرسائل (المساعد الذكي) ---

async def intelligent_assistant_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    الدالة الرئيسية التي تستقبل الرسائل، تصنفها، ثم توجهها للمعالج المناسب.
    """
    user_message = update.message.text
    if not user_message:
        return

    # 1. الفهم: تصنيف نية المستخدم
    intent = await classify_user_intent_groq(user_message)

    # 2. التصرف: توجيه الطلب للدالة المناسبة
    if intent == 'app_search':
        await handle_app_search(update, context)
    elif intent == 'app_recommendation':
        await handle_app_recommendation(update, context)
    elif intent == 'greeting_or_chat':
        await handle_greeting_or_chat(update, context)
    elif intent == 'problem_report':
        await handle_problem_report(update, context)
    else:
        # رد افتراضي في حال حدوث خطأ غير متوقع
        await update.message.reply_text("عذرًا، لم أفهم طلبك. هل يمكنك إعادة صياغته؟")

# --- دالة البدء الرئيسية ---

def main() -> None:
    """دالة تشغيل البوت."""
    if not TELEGRAM_TOKEN or not GROQ_API_KEY:
        logger.error("لم يتم العثور على TELEGRAM_TOKEN أو GROQ_API_KEY. يرجى إضافتهما.")
        return

    # إنشاء تطبيق البوت
    application = Application.builder().token(TELEGRAM_TOKEN).build()

    # إضافة معالج الرسائل الرئيسي
    # هذا المعالج سيعمل على كل الرسائل النصية التي ليست أوامر (لا تبدأ بـ /)
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, intelligent_assistant_handler))

    # بدء تشغيل البوت
    logger.info("البوت قيد التشغيل...")
    application.run_polling()

if __name__ == "__main__":
    main()

