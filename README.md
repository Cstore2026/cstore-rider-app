# C Store Rider App

أبلكيشن الطيار الخاص بـ C Store Delivery.

## فكرة التطبيق

- يستخدم نفس Supabase الخاص بالداش بورد.
- يدخل الطيار بنفس Username و Password الموجودين في جدول app_users.
- يعرض أوردرات الطيار فقط.
- أي تحديث في الأبلكيشن يظهر في الداش بورد والعكس.

## Vercel Environment Variables

ضع نفس المتغيرات الموجودة في مشروع الداش بورد:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```
