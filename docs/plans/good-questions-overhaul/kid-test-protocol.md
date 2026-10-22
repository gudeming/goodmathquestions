# 儿童测试协议 · Kid-Test Protocol

> README Phase 7 第 4 项。本文件只是协议和记录表；测试由人来做。
> README Phase 7 item 4. This file is the protocol and the record sheets; people run the sessions.

中文在前，English below（[跳到英文 / jump to English](#english)）。

---

## 中文

### 1. 目的

用 5 个真实的孩子回答一个问题：**这些题孩子愿意玩、玩得懂、玩完想讲给别人听吗？**
结果写回每道题 blueprint 的 `rubricNotes`，并决定这道题保留、修改还是撤下。

### 2. 角色

| 角色 | 人数 | 做什么 |
|---|---|---|
| 主持人 | 1 | 照脚本说话，只问开放问题，不教、不说对错 |
| 记录员 | 1 | 填观察表（§7），记时间点和孩子的原话 |
| 家长 | 每个孩子 1 位 | 签同意书；可以在旁边，但请不要提示 |

主持人和记录员不要是同一个人：一边引导一边记录，会漏掉最重要的表情和停顿。

### 3. 招募

- **5 个孩子，8–14 岁，年龄要混合**：至少 1 个 8–10 岁、2 个 10–12 岁、1 个 12–14 岁，剩下 1 个任意。
- 性别尽量均衡；**不要只找「数学好」的孩子**，至少 2 个孩子自己说「数学一般」或「不太喜欢数学」。
- 中文和英文界面都要有人用：至少 1 个孩子用英文界面、至少 1 个用中文界面（让孩子自己选更舒服的语言）。
- 团队成员自己的孩子最多 1 个，并在结果里标出来（他们更容易「给面子」）。
- 孩子之前没玩过这 3 道题。

### 4. 给家长的同意说明（发给家长，签字或书面回复「同意」）

> 您好！我们在做一个给 8–14 岁孩子的趣味数学网站 goodmathquestions.com，想请您的孩子帮我们试玩 20 分钟。
>
> - **做什么**：孩子在电脑或平板上玩 3 道数学题，一边玩一边把想法说出来。没有考试，没有对错，我们测的是题目好不好，不是孩子。
> - **记录什么**：我们会手写记录孩子说的话和卡住的地方。**只有在您另外同意时**才录屏幕和声音；不拍孩子的脸。
> - **不收集**：孩子的全名、学校、照片。孩子以游客身份使用，不注册账号。记录里只用代号（如「K3，11 岁」）。
> - **用途**：只用于改进题目，不公开发布。屏幕录像（如有）在测试结束 30 天内删除。
> - **随时可以停**：孩子不想玩了就停，不需要理由。您可以在旁边陪着。
> - 如有问题请联系：＿＿＿＿＿＿（负责人姓名 / 电话 / 邮箱）
>
> 孩子代号：＿＿＿　孩子年龄：＿＿＿
> ☐ 同意参加　☐ 同意录屏幕和声音（可不勾）
> 家长签字：＿＿＿＿＿＿　日期：＿＿＿＿＿＿

开始前也要问孩子本人：「我们想看看这几道题好不好玩，你愿意帮忙试试吗？不想玩随时可以停。」孩子说不愿意就不做。

### 5. 准备

- 设备：一台笔记本或平板，**用全新的无痕 / 隐私窗口**（清空 localStorage，保证孩子从第一幕开始、不是登录状态）。
- 题目（按这个顺序，从容易到难）：

| 顺序 | slug | 年龄段 | 题目 | 链接 |
|---|---|---|---|---|
| Q1 | `handshake-party` | AGE_8_10 | 派对上的握手 | `/zh/questions/handshake-party` 或 `/questions/handshake-party` |
| Q2 | `gauss-sum` | AGE_10_12 | 几秒钟就算完的男孩 | `/zh/questions/gauss-sum` |
| Q3 | `kaprekar-6174` | AGE_12_14 | 黑洞数 | `/zh/questions/kaprekar-6174` |

- 三个标签页提前打开，但**孩子开始一道题时才切过去**。
- 桌上放纸和笔（有的孩子想画，这本身就是数据）。
- 计时器一个；记录员每道题记下「打开题目」的时刻，后面所有时间都相对这个时刻。
- 测试结束后，admin「题目漏斗」页（`/admin/funnel`）里会出现这几次访问；在结果表里记下测试日期，以免把测试数据当成真实用户数据。

### 6. 20 分钟脚本

| 时间 | 环节 | 主持人怎么说 / 做 |
|---|---|---|
| 0:00–2:00 | 热身 | 「今天不是考试。我们做了几道题，想知道它们好不好玩。题目有问题是题目的错，不是你的错。你一边玩一边把脑子里想的说出来，像在给朋友直播一样。」先让孩子说说最近一件好玩的事，练习「边想边说」。 |
| 2:00–7:00 | Q1 握手 | 打开 Q1。「你先自己读，想做什么就做什么。」之后只用 §6.1 的提示语。 |
| 7:00–12:00 | Q2 高斯 | 同上。 |
| 12:00–17:00 | Q3 黑洞数 | 同上。8–10 岁的孩子在这道题上卡住超过 3 分钟就可以结束这道题：「这道题很难，我们看看答案吧。」请孩子点「看答案」进入揭示，照样问 §6.2 的问题。 |
| 17:00–20:00 | 收尾 | 问 §6.2 的结束问题；谢谢孩子；（可选）给一张贴纸。 |

**每道题最多 5 分钟。**时间到了还没答对：「我们看看答案吧」，然后问揭示后的问题。不要因为想拿到「答对」而超时。

主持人的规则：
1. **不教，不提示，不说「对」「错」「很接近」。**孩子问「对吗？」就回答：「你觉得呢？网站会告诉你。」
2. 孩子卡住**超过 90 秒**不说话不操作，才可以说：「如果你想要帮助，页面上有什么可以用的吗？」（指向提示按钮，但不替孩子按。）
3. 孩子说「好无聊」「我不想做了」：记下原话和时间点，问一句「是哪里让你觉得无聊？」，然后直接进入下一道题。这是最有价值的数据之一。
4. 不评价孩子的猜测（「哇这么大！」也算评价）。

#### 6.1 边玩边说的提示语（只用这些）

- 「你现在在想什么？」
- 「你觉得接下来会发生什么？」
- 「你为什么猜这个数？」（只在孩子猜完之后问）
- 「你刚才点了那里，你想看到什么？」
- 「这个画面告诉你什么了吗？」
- 「如果要你跟朋友讲这道题，你会怎么讲？」
- 孩子沉默超过 20 秒：「继续说说你在想什么。」

#### 6.2 揭示后 / 结束时的问题

每道题揭示后：
1. 「答案和你猜的一样吗？你觉得怎么样？」（记原话）
2. 「哪一步最有意思？哪一步最没意思？」
3. **「你会把这道题拿给朋友看吗？」会 / 不会，为什么？**（一定要问，一定要记「为什么」）

全部结束时：
4. 「三道题里你最喜欢哪一道？为什么？」
5. 「有没有哪里让你看不懂、或者不知道该点什么？」
6. 「如果你可以改一个地方，你会改什么？」

### 7. 观察表（每个孩子一张，记录员填写）

孩子代号：＿＿　年龄：＿＿　界面语言：中 / 英　日期：＿＿　是否团队成员的孩子：是 / 否

| 题目 | 第一次笑 / 惊讶（时间 + 在哪一步 + 原话） | 卡住的地方（时间 + 在哪一步 + 卡了多久） | 用了几条提示（0–3）+ 用到第几条才懂 | 猜测值 / 第一次答案 / 最终是否答对 | 揭示时说了什么（原话） | 会拿给朋友看吗？会 / 不会 + 为什么（原话） | 其他（在纸上画了什么、操作场景的次数、想放弃的时刻） |
|---|---|---|---|---|---|---|---|
| Q1 handshake-party | | | | | | | |
| Q2 gauss-sum | | | | | | | |
| Q3 kaprekar-6174 | | | | | | | |

「在哪一步」用这些词：**钩子（第一幕读题）/ 猜测 / 场景操作 / 作答 / 错误反馈 / 提示 / 揭示 / 延伸 / 讨论区**。

结束问题（§6.2 第 4–6 题）原话：＿＿＿＿＿＿＿＿＿＿

### 8. 结果汇总模板（每道题一张，5 个孩子测完后填）

```markdown
### <slug> · 儿童测试 <YYYY-MM-DD>

| 孩子 | 年龄 | 语言 | 第一次笑/惊讶 | 卡住 | 提示数 | 答对 | 会给朋友看 | 为什么（原话） |
|---|---|---|---|---|---|---|---|---|
| K1 | 9  | zh | 场景操作 0:40 | 作答 2:10 | 2 | 是 | 会 | 「我要考我哥」 |
| K2 | … |

- 会给朋友看：N/5
- 平均提示数：x.x；最多人卡住的一步：＿＿（N/5）
- 第一次笑/惊讶最常出现的一步：＿＿
- 孩子说的最好的一句话：「＿＿」
- 要改的地方（按优先级）：1. ＿＿ 2. ＿＿
- rubric 调整：retell 2→1（理由），hints 2→1（理由）……
- 决定：保留 / 修改后再测 / 撤下
```

**回写到 blueprint 的 `rubricNotes`**（由内容负责人改 `packages/db/prisma/hero-questions/world-*.ts`，然后跑 `npm run content-lint`）：在原有字符串后面追加一段，格式固定，方便以后检索：

```
"19/20 — hook 2, guess 2, … retell 1 | kid-test 2026-11-08: friend 4/5, hints avg 1.2, stuck@scene 2/5, smile@reveal 3/5; fix: hint 2 too big a jump"
```

- 如果测试结果改变了某一项的分数，**同时改前面的总分和那一项**（`validate.ts` 会检查各项之和等于总分；总分 < 14 的题不能发布）。
- 「会给朋友看」≤ 2/5 的题：retell（值得转述）最多给 1 分，并列入修改清单。

### 9. 通过标准（README §3）

**主标准**：5 个孩子中 **≥ 4 个**对 **≥ 3 道题**说「会拿给朋友看」。本协议每个孩子玩 3 道题，所以等价于：**至少 4 个孩子三道题都说「会」**。

| 结果 | 判定 |
|---|---|
| ≥ 4 个孩子三道都说「会」 | 通过，可以铺量（README §7 的垂直切片验收） |
| 3 个孩子 | 不通过：按 §8 修改「会」最少的那道题，换 5 个新孩子再测 |
| ≤ 2 个孩子 | 不通过：先停下来复盘三幕流程本身（钩子、猜测、场景），而不是单道题的文案 |

**单题诊断**（不影响主标准，用来决定改哪道）：某道题「会」≤ 2/5，或 ≥ 3/5 的孩子在同一步卡住超过 90 秒，这道题必须修改后再测。

**参考指标**（同一批孩子太少，不做判定，只用来对照 `/admin/funnel` 的真实数据）：做了第一幕猜测的比例（目标 ≥ 60%）、到达揭示的比例（目标 ≥ 40%）。

---

<a id="english"></a>

## English

### 1. Purpose

Use five real children to answer one question: **do kids want to play these questions, understand them, and want to tell someone about them afterwards?**
Results go back into each blueprint's `rubricNotes` and decide whether a question stays, gets reworked, or is pulled.

### 2. Roles

| Role | How many | Does what |
|---|---|---|
| Facilitator | 1 | Follows the script, asks open questions only, never teaches or says right/wrong |
| Note-taker | 1 | Fills in the observation sheet (§7): timestamps and the child's exact words |
| Parent | 1 per child | Signs consent; may sit nearby but please doesn't help |

Keep facilitator and note-taker separate: the person steering misses the faces and pauses that matter most.

### 3. Recruiting

- **Five children aged 8–14, mixed ages**: at least one aged 8–10, two aged 10–12, one aged 12–14, and one more of any age.
- Mix genders; **do not recruit only "maths kids"**: at least two children should describe themselves as "OK at maths" or "not into maths".
- Both interfaces get used: at least one child on the English UI and one on the Chinese UI (let each child pick the language they are more comfortable in).
- At most one child of a team member, and mark them in the results (they are more likely to be polite).
- No child has seen these three questions before.

### 4. Consent note for parents (send ahead; signature or a written "I agree")

> Hello! We are building goodmathquestions.com, a playful maths site for 8–14 year olds, and would love your child to try it for 20 minutes.
>
> - **What happens**: your child plays three maths questions on a laptop or tablet and says what they are thinking as they go. It is not a test and there are no wrong answers: we are testing the questions, not your child.
> - **What we record**: handwritten notes of what your child says and where they get stuck. Screen and audio are recorded **only if you tick the box below**; we never film faces.
> - **What we don't collect**: full name, school, photos. Your child plays as a guest with no account. Notes use a code such as "K3, age 11".
> - **Use**: only to improve the questions; nothing is published. Any screen recording is deleted within 30 days.
> - **Stop any time**: your child can stop whenever they like, no reason needed. You are welcome to stay in the room.
> - Questions: ______ (organiser's name / phone / email)
>
> Child code: ___  Age: ___
> ☐ I agree to my child taking part  ☐ I agree to screen and audio recording (optional)
> Parent signature: ______  Date: ______

Ask the child too: "We want to find out if these questions are fun. Would you like to help us try them? You can stop whenever you want." If the child says no, don't run the session.

### 5. Setup

- Device: a laptop or tablet, **in a fresh private / incognito window** (empty localStorage, so the child starts at Act 1 as a guest).
- Questions, in this order (easiest first):

| Order | slug | Age band | Title | Link |
|---|---|---|---|---|
| Q1 | `handshake-party` | AGE_8_10 | Party Handshakes | `/questions/handshake-party` or `/zh/questions/handshake-party` |
| Q2 | `gauss-sum` | AGE_10_12 | The Boy Who Beat the Teacher | `/questions/gauss-sum` |
| Q3 | `kaprekar-6174` | AGE_12_14 | The Black Hole Number | `/questions/kaprekar-6174` |

- Open the three tabs beforehand, but **switch to a question only when the child starts it**.
- Put paper and a pencil on the table (a child who wants to draw is data too).
- Have a timer. The note-taker records the moment each question opens; every other time is relative to it.
- These sessions will show up on the admin funnel page (`/admin/funnel`). Note the test date in the results so test traffic isn't mistaken for real users.

### 6. The 20-minute script

| Time | Part | What the facilitator says / does |
|---|---|---|
| 0:00–2:00 | Warm-up | "This isn't a test. We made some questions and want to know if they're fun. If something is confusing, that's the question's fault, not yours. Please say what you're thinking out loud as you play, like you're streaming it to a friend." Ask about something fun they did recently to practise thinking aloud. |
| 2:00–7:00 | Q1 handshakes | Open Q1. "Read it yourself and do whatever you feel like." From here on use only the prompts in §6.1. |
| 7:00–12:00 | Q2 Gauss | Same. |
| 12:00–17:00 | Q3 black hole number | Same. If an 8–10 year old is stuck for more than 3 minutes, end it kindly: "This one's really hard, let's look at the answer." Have them use "Show me" / the reveal and still ask §6.2. |
| 17:00–20:00 | Wrap-up | Ask the closing questions in §6.2; thank the child; (optional) a sticker. |

**Five minutes per question at most.** If time runs out before a correct answer: "Let's look at the answer," then ask the post-reveal questions. Don't run over just to get a correct answer.

Facilitator rules:
1. **Don't teach, don't hint, don't say "right", "wrong" or "close".** If the child asks "Is that right?", say "What do you think? The site will tell you."
2. Only after **more than 90 seconds** with no talking and no clicking may you say: "If you'd like some help, is there anything on the page you could use?" (Point toward the hint button; don't press it for them.)
3. If the child says "this is boring" or "I don't want to do this": write down the exact words and the time, ask once "What part feels boring?", then move to the next question. This is some of the most valuable data you'll get.
4. Don't react to guesses ("Wow, that big!" is a reaction too).

#### 6.1 Think-aloud prompts (use only these)

- "What are you thinking right now?"
- "What do you think will happen next?"
- "Why did you guess that number?" (only after they have guessed)
- "You just clicked there. What were you hoping to see?"
- "Is the picture telling you anything?"
- "If you had to explain this question to a friend, how would you say it?"
- After 20 seconds of silence: "Keep telling me what you're thinking."

#### 6.2 After each reveal / at the end

After each reveal:
1. "Was the answer what you guessed? How do you feel about that?" (exact words)
2. "Which part was the most interesting? Which part was the least?"
3. **"Would you show this question to a friend?" Yes / no, and why?** (always ask, always record the "why")

At the very end:
4. "Which of the three did you like best? Why?"
5. "Was there anywhere you didn't understand, or didn't know what to click?"
6. "If you could change one thing, what would it be?"

### 7. Observation sheet (one per child, filled in by the note-taker)

Child code: __  Age: __  UI language: zh / en  Date: __  Team member's child: yes / no

| Question | First smile / surprise (time + step + words) | Where stuck (time + step + how long) | Hints used (0–3) + which one made it click | Guess / first answer / solved in the end? | What they said at the reveal (exact words) | Would you show a friend? yes / no + why (exact words) | Other (drawings on paper, number of scene interactions, moments they wanted to quit) |
|---|---|---|---|---|---|---|---|
| Q1 handshake-party | | | | | | | |
| Q2 gauss-sum | | | | | | | |
| Q3 kaprekar-6174 | | | | | | | |

For "step" use these words: **hook (Act 1 reading) / guess / scene / answer / wrong-answer coach / hint / reveal / extension / discussion**.

Closing answers (§6.2 questions 4–6), exact words: __________

### 8. Results template (one per question, after all five sessions)

```markdown
### <slug> · kid test <YYYY-MM-DD>

| Child | Age | Lang | First smile/surprise | Stuck | Hints | Solved | Show a friend | Why (exact words) |
|---|---|---|---|---|---|---|---|---|
| K1 | 9  | zh | scene 0:40 | answer 2:10 | 2 | yes | yes | "I'm going to test my brother" |
| K2 | … |

- Would show a friend: N/5
- Average hints: x.x; step where most got stuck: __ (N/5)
- Step where the first smile/surprise happened most: __
- Best thing a child said: "__"
- Fixes, in priority order: 1. __ 2. __
- Rubric changes: retell 2→1 (reason), hints 2→1 (reason) …
- Decision: keep / rework and retest / pull
```

**Write it back into the blueprint's `rubricNotes`** (the content owner edits `packages/db/prisma/hero-questions/world-*.ts`, then runs `npm run content-lint`). Append one segment to the existing string in a fixed format so it can be searched later:

```
"19/20 — hook 2, guess 2, … retell 1 | kid-test 2026-11-08: friend 4/5, hints avg 1.2, stuck@scene 2/5, smile@reveal 3/5; fix: hint 2 too big a jump"
```

- If the test changes an item's score, **change both that item and the total** (`validate.ts` checks that the items add up to the total; a total below 14 can't be published).
- A question with "show a friend" ≤ 2/5 gets at most 1 point for retell and goes on the rework list.

### 9. Pass criteria (README §3)

**Main criterion**: **at least 4 of the 5 children** say "yes, I'd show a friend" for **at least 3 questions**. Each child plays three questions here, so this means: **at least four children say "yes" to all three.**

| Result | Verdict |
|---|---|
| ≥ 4 children say yes to all three | Pass: go ahead and scale up (README §7 vertical-slice gate) |
| 3 children | Fail: rework the question with the fewest "yes" answers (§8) and retest with five new children |
| ≤ 2 children | Fail: stop and review the three-act flow itself (hook, guess, scene), not just one question's copy |

**Per-question diagnosis** (doesn't change the main verdict; decides what to fix): a question with ≤ 2/5 "yes", or where ≥ 3/5 children got stuck at the same step for more than 90 seconds, must be reworked and retested.

**Reference metrics** (too few children to judge on; compare with real traffic on `/admin/funnel`): share who made an Act 1 guess (target ≥ 60%) and share who reached the reveal (target ≥ 40%).
