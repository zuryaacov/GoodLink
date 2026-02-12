# Page snapshot

```yaml
- generic [ref=e6]:
  - link "Good Link" [ref=e7] [cursor=pointer]:
    - /url: /
    - img [ref=e9]
    - heading "Good Link" [level=2] [ref=e12]:
      - generic [ref=e13]: Good
      - generic [ref=e14]: Link
  - generic [ref=e16]:
    - generic [ref=e17]:
      - heading "Reset Password" [level=1] [ref=e18]
      - paragraph [ref=e19]: We'll send you recovery instructions
    - generic [ref=e20]:
      - generic [ref=e21]:
        - generic [ref=e22]: Email Address
        - textbox "name@example.com" [active] [ref=e23]: bad-email
      - button "Send Link" [ref=e24] [cursor=pointer]
    - button "arrow_back Back to Login" [ref=e25] [cursor=pointer]:
      - generic [ref=e26]: arrow_back
      - text: Back to Login
  - generic [ref=e27]:
    - text: By continuing, you agree to GoodLink's
    - link "Terms of Service" [ref=e28] [cursor=pointer]:
      - /url: "#"
    - text: and
    - link "Privacy Policy" [ref=e29] [cursor=pointer]:
      - /url: "#"
    - text: .
```