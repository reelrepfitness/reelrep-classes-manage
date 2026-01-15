Act as a Senior React Native Developer.

**CRITICAL LAYOUT INSTRUCTION: FORCE RTL (RIGHT-TO-LEFT)**

The app is **100% Hebrew**. It must ALWAYS be RTL, regardless of the user's device language settings (English, French, etc.).

**Implementation Rules:**

1.  **Global Enforcement:**
    * In `App.js` (or `index.js`), you must explicitly execute:
        ```javascript
        import { I18nManager } from 'react-native';
        
        if (!I18nManager.isRTL) {
          I18nManager.allowRTL(true);
          I18nManager.forceRTL(true);
          // Note: This usually requires a restart, but ensure the code is there.
        }
        ```

2.  **Styling Rules (Hardcoded RTL):**
    * **Text Alignment:** ALL text must have `textAlign: 'right'`. Do not rely on 'auto'.
    * **Flex Containers:**
        * When using `flexDirection: 'row'`, ensure items start from the RIGHT.
        * If the system is English (LTR), you might need to use `flexDirection: 'row-reverse'` OR explicitly set `justifyContent: 'flex-end'` for rows, but the preferred method is forcing the app context to RTL.
    * **Inputs:** All `<TextInput />` components must have `textAlign="right"` and `writingDirection="rtl"`.

3.  **Icons & Chevrons:**
    * Back arrows should point RIGHT (->) in RTL context if that's the navigation flow, but typically "Back" points to the start of the flow.
    * Menu icons / Lists must align to the Right.

**Task:**
Review all current screens and ensure that NO element is aligned to the left. Everything must originate from the Right side.