# DARNA Admin — Microcopy Guide (Règles de Langage et de Rédaction)

This document formalizes the voice, tone, and microcopy guidelines for the DARNA Admin Console in accordance with the Human-Computer Interaction course (*Concepts de base d'IHM*, ENP, Dr. O. Arki, Théorie 3 : Loi de Hick & Langage employé).

---

## 1. Core Language Principles (Course Slide 108)

1. **Utiliser le langage de l'utilisateur (Speak the User's Language):**
   - Eliminate developer and database terminology. We never show raw machine states (`pending_review`, `audit_log`, `payout_ledger`, `adr`, `sla`, `gmv`, `kpi`).
   - Use human, tangible concepts: *"Waiting for your decision"*, *"Money paid by guests"*, *"DARNA earnings"*, *"History of actions"*.
2. **Éviter les abréviations (No Cryptic Abbreviations):**
   - Always spell out terms or use transparent phrases: *"Algerian Dinars (DZD)"*, not *"CUR"*; *"Tourism License"*, not *"TL-REG"*.
3. **Voix active et forme affirmative (Active Voice & Affirmative Phrasing):**
   - Say what will happen or what the user can do, not what is forbidden.
   - Example: *"Add a reason so Karim understands what to fix"* instead of *"Reason field cannot be empty"*.
4. **Boutons : Verbe + Objet (Action Buttons = Verb + Object):**
   - Ban generic buttons like "OK", "Submit", "Proceed", or bare "Confirm".
   - Use precise intent: *"Approve host"*, *"Reject listing"*, *"Recharge wallet"*, *"Restore account"*, *"Send feedback"*.
5. **Éviter les impasses (No Dead Ends):**
   - Every error message and empty state must provide a direct recovery path and actionable button.
6. **Politesse et respect (Politeness & Respect):**
   - French microcopy consistently uses the respectful **"vous"** form (*"Vous êtes sur le point de..."*, *"Consultez les demandes..."*).
   - Arabic microcopy employs polite, professional modern standard Arabic natural to Algerian administrative conventions (not stiff automated translations).

---

## 2. Terminology Conversion Dictionary (Lexique Banni vs Recommandé)

| System / Jargon (Banned) | Plain English | Français Recommandé | العربية الطبيعية (الجزائر) |
|---|---|---|---|
| **GMV / Gross Volume** | Money paid by guests | Argent payé par les voyageurs | المبالغ المدفوعة من الضيوف |
| **Commission Revenue** | DARNA earnings | Revenus de DARNA | أرباح دارنا |
| **Occupancy Rate** | Nights booked out of nights available | Nuits réservées sur les nuits disponibles | الليالي المحجوزة من الليالي المتاحة |
| **Pending Review** | Waiting for your decision | En attente de votre décision | في انتظار قراركم |
| **Churn / Cancellation Rate** | Bookings cancelled | Réservations annulées | الحجوزات الملغاة |
| **Payout** | Payment to host | Versement à l'hôte | دفع المستحقات للمضيف |
| **Audit Log** | History of actions | Historique des actions | سجل العمليات |
| **Onboarding Config** | Host sign-up steps | Étapes d'inscription des hôtes | خطوات تسجيل المضيفين |
| **Users** | Guests | Voyageurs & invités | الضيوف والمسافرون |
| **Finance** | Money | Finances & Portefeuilles | المعاملات المالية |
| **Disputes** | Disputed bookings | Litiges de réservation | النزاعات في الحجوزات |

---

## 3. Comprehensive Microcopy Table

### 3.1 Confirmation Prompts (Near-Zero Risk Safety)

| Context | English | Français (Forme « Vous ») | العربية الطبيعية |
|---|---|---|---|
| **Reject Host** | "You are about to reject {name}. They will receive your feedback and can reapply. You can restore them later." | "Vous êtes sur le point de refuser la candidature de {name}. L'hôte sera informé de vos remarques et pourra soumettre à nouveau son dossier. Vous pourrez restaurer ce compte à tout moment." | "أنتم على وشك رفض ملف {name}. سيصلهم توضيحكم ويمكنهم إعادة تقديم الطلب. يمكنكم استعادة الحساب لاحقاً." |
| **Approve Host** | "Approve {name} as an active {type}? Their listings will become visible to Algerian guests." | "Confirmer l'approbation de {name} en tant que {type} ? Ses annonces seront immédiatement visibles aux voyageurs." | "تأكيد قبول {name} كـ {type}؟ ستظهر أماكن الإقامة للمسافرين مباشرة." |
| **Suspend Account** | "Suspend {name}? Their listings and current bookings will be paused immediately." | "Suspendre temporairement {name} ? Ses annonces et ses réservations en cours seront mises en pause immédiatement." | "تعليق حساب {name} مؤقتاً؟ سيتم إيقاف ظهور إعلاناته وحجوزاته مؤقتاً." |
| **Restore Account** | "Restore {name} to active standing? All listings and permissions will be reactivated." | "Rétablir {name} ? Toutes ses annonces et ses accès seront réactivés avec son historique intact." | "استعادة حساب {name}؟ سيتم إعادة تفعيل كافة إعلاناته وصلاحياته." |
| **Recharge Wallet** | "Credit {amount} DZD to {name}'s wallet? New balance will be {newBalance} DZD." | "Créditer {amount} DZD sur le portefeuille de {name} ? Le nouveau solde sera de {newBalance} DZD." | "شحن محفظة {name} بمبلغ {amount} د.ج؟ سيصبح الرصيد الجديد {newBalance} د.ج." |

---

### 3.2 Success Toasts & Feedback (< 100ms Reaction, ~8s Undo)

| Action | English | Français | العربية |
|---|---|---|---|
| **Host Approved** | "Host approved. They were notified." | "Hôte approuvé avec succès. L'hôte a été notifié." | "تم قبول المضيف بنجاح، وتم إرسال الإشعار إليه." |
| **Host Rejected** | "Host application rejected. Feedback delivered." | "Dossier refusé. Les motifs ont été transmis à l'hôte." | "تم رفض الملف وإرسال أسباب الملاحظات إلى المضيف." |
| **Listing Approved** | "Listing published to DARNA marketplace." | "Annonce validée et mise en ligne sur DARNA." | "تم اعتماد الإعلان ونشره على منصة دارنا." |
| **Listing Changes** | "Feedback sent to host. Listing set to awaiting edits." | "Demande de modifications envoyée à l'hôte." | "تم إرسال طلب التعديل إلى المضيف بنجاح." |
| **Wallet Recharged** | "Wallet credited {amount} DZD. Receipt saved to history." | "Portefeuille crédité de {amount} DZD. Reçu enregistré." | "تم شحن المحفظة بمبلغ {amount} د.ج وحفظ الإيصال في السجل." |
| **Undo Toast** | "Action undone. Entity restored to previous state." | "Action annulée. L'élément a été rétabli dans son état précédent." | "تم التراجع عن الإجراء واستعادة الحالة السابقة بنجاح." |

---

### 3.3 Error Messages (Affirmative, Polite, Action-Oriented)

| Scenario | Poor / Robotic Phrasing | Approved Friendly Microcopy (en) | Approved French (fr) | Approved Arabic (ar) |
|---|---|---|---|---|
| **Missing Reason** | "Error 422: Reason is mandatory." | "Please add a short note so the host knows what to fix before resubmitting." | "Veuillez préciser la raison afin que l'hôte sache quoi modifier dans son dossier." | "يرجى إضافة ملاحظة توضيحية ليعرف المضيف ما يجب تعديله قبل إعادة المحاولة." |
| **Overdrawn Balance** | "Ledger exception: negative balance disallowed." | "The requested payout exceeds the current host wallet balance. Current balance: {balance} DZD." | "Le montant du versement dépasse le solde disponible ({balance} DZD). Ajustez le montant pour continuer." | "مبلغ السحب المطلوب يتجاوز الرصيد الحالي للمحفظة ({balance} د.ج). يرجى تعديل المبلغ." |
| **Upload Failure** | "File upload rejected: MIME error." | "We could not read this document. Please upload a clear JPG, PNG, or PDF under 5 MB." | "Le document n'a pas pu être lu. Choisissez une image JPG, PNG ou un fichier PDF clair de moins de 5 Mo." | "تعذر قراءة المستند. يرجى اختيار ملف JPG أو PNG أو PDF واضح وأقل من 5 ميغابايت." |
| **Connection Timeout** | "Error: Gateway timeout 504." | "DARNA is taking longer than usual to answer. Your changes are safe. Please click Retry." | "La réponse du serveur prend un peu plus de temps. Vos données sont préservées. Cliquez sur Réessayer." | "استغرقت الاستجابة وقتاً أطول من المعتاد. بياناتكم محفوظة، يرجى الضغط على إعادة المحاولة." |

---

### 3.4 Empty States (Always Teach the Next Step)

| Page / Section | English Microcopy | Français | العربية | Action Button |
|---|---|---|---|---|
| **Approvals Inbox (0 hosts)** | "You're all caught up! No hosts are waiting for approval. New applications will appear here." | "Tout est à jour ! Aucun hôte n'est en attente de validation. Les nouveaux dossiers apparaîtront ici." | "كل الأمور منجزة! لا يوجد أي مضيف في انتظار المراجعة حالياً." | "See active hosts" / "Consulter les hôtes" |
| **Approvals Inbox (0 listings)** | "All listings have been reviewed. Enjoy the calm!" | "Toutes les annonces sont vérifiées. Rien à signaler pour l'instant !" | "تمت مراجعة جميع الإعلانات بنجاح. لا توجد طلبات معلقة." | "Explore marketplace" / "Voir les annonces" |
| **Search (0 results)** | "No results found for '{query}'. Try searching by wilaya name, partner name, or clear your filters." | "Aucun résultat trouvé pour « {query} ». Essayez de chercher par wilaya, par nom, ou effacez vos filtres." | "لم نجد أي نتيجة تطابق '{query}'. جربوا البحث باسم الولاية أو الشريك أو مسح الفلاتر." | "Clear all filters" / "Réinitialiser les filtres" |
| **Disputes (0 active)** | "Zero open disputes. Host and guest stays are running smoothly across all 58 wilayas." | "Aucun litige ouvert. Les séjours se déroulent sereinement dans les 58 wilayas." | "لا توجد أي نزاعات مفتوحة. الحجوزات تسير بكل سلاسة عبر كافة الولايات." | "View completed stays" / "Voir l'historique" |

---

### 3.5 Beginner Tooltips & Dashboard Glance

| Key Metric | Help Tooltip Definition (One Sentence) | How It's Counted |
|---|---|---|
| **Bookings** | "The total number of stays and experiences reserved by guests during this period." | Count of all confirmed and completed booking transactions. |
| **Money paid by guests** | "The total amount paid in Algerian Dinars by guests for all bookings." | Sum of night rates, fees, and services paid by guests. |
| **DARNA earnings** | "The platform commission retained by DARNA to operate services, marketing, and support." | Net commission percentage deducted from gross booking transactions. |
| **New hosts** | "New Algerian partners who signed up and got approved during this period." | Verified host profiles that passed identity and licensing inspection. |
