# StudyMind Golden Paths (Phase 2)

Automated and manual journeys that must pass before every release.

## Student journeys

1. **New student onboarding**
   - Sign up via Clerk
   - Choose curriculum / level / weak subjects
   - `onboardingDone = true`
   - Land on Home with personalized empty state

2. **Complete practice session**
   - Start practice (subject or weak topics)
   - Answer ≥ 5 questions
   - Learning Brain mastery updates
   - XP awarded, streak touched
   - Session summary shown

3. **AI Tutor after wrong answer**
   - Submit incorrect answer
   - Request explanation
   - Tutor returns structured response (explanation, misconception, next action)
   - Conversation persisted

4. **Finish mock exam**
   - Start WAEC/JAMB simulation
   - Navigate, mark for review, submit
   - Score + report generated
   - Mastery updates post-exam

5. **SM-2 review due**
   - After prior practice, concept has `nextReviewAt`
   - Review queue surfaces item
   - Completing review updates interval / ease

6. **Dashboard update**
   - After practice/exam, dashboard reflects mastery, streak, readiness
   - Loads within performance SLO

7. **Gamification**
   - XP increments
   - Achievement unlock when threshold met
   - Challenge progress updates

## Operator journeys

8. **Admin import questions**
   - CSV/JSON import under a content release
   - Validation report
   - Questions searchable and usable in practice

9. **Student asks AI about imported question**
   - Tutor receives question + concept context from Question Bank + Learning Brain

## Qualitative micro-prompts (beta)

- Was this explanation helpful?
- Was this question too easy, about right, or too difficult?
- Did the recommended next topic feel useful?

## Release gate

- [ ] All golden paths green
- [ ] No critical bugs open
- [ ] Performance SLOs measured on staging
- [ ] Content release status = `published` for scoped subjects
