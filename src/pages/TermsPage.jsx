import React from 'react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-slate-200 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-3 text-black transition-opacity hover:opacity-80 w-fit"
          >
            <div className="size-5 sm:size-7 text-primary flex-shrink-0">
              <svg fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  stroke="#6358de"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  stroke="#6358de"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <span className="text-2xl font-black leading-tight tracking-tight text-[#6358de]">
              GoodLink
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-[#1b1b1b] mb-6">Terms of Service</h1>
        <div className="prose prose-sm sm:prose max-w-none text-slate-700">
          <p>
            Subject to these Terms of Service (this &quot;Agreement&quot;), goodlink.ai
            (&quot;goodlink&quot;, &quot;we&quot;, &quot;us&quot; and/or &quot;our&quot;) provides
            access to goodlink.ai platform as a service (collectively, the &quot;Services&quot;).
            By using or accessing the Services, you acknowledge that you have read, understand, and
            agree to be bound by this Agreement. We may revise the Agreement terms or any additional
            terms and conditions that are relevant to the goodlink.ai from time to time. You agree
            that we shall not be liable to you or to any third party for any modification of this
            Agreement.
          </p>
          <p>
            If you are entering into this Agreement on behalf of a company, business or other legal
            entity, you represent that you have the authority to bind such entity to this Agreement,
            in which case the term &quot;you&quot; shall refer to such entity. If you do not have
            such authority, or if you do not agree with this Agreement, you must not accept this
            Agreement and may not use the Services.
          </p>

          <h2>1. GoodLink Services</h2>
          <h3>1.1 Description of Services</h3>
          <p>
            GoodLink is a link attribution and marketing analytics platform designed to enable
            modern marketing teams to generate shortened links, monitor link performance analytics,
            and implement server-to-server Conversion API (&quot;CAPI&quot;) integrations. The
            GoodLink platform is made available at goodlink.ai, as well as through any additional
            domains and subdomains owned or controlled by us (collectively, the &quot;Website&quot;).
          </p>
          <p>
            GoodLink Links permits authorized GoodLink clients (&quot;Clients&quot;) to create and
            customize shortened links, analyze and track link performance metrics, and manage
            marketing activities through structured workspaces, campaigns, and groups.
          </p>
          <p>
            In order to utilize server-to-server tracking capabilities, you are required to
            integrate GoodLink with your own systems and infrastructure in accordance with the
            technical documentation and instructions published on the Website. You acknowledge and
            agree that you bear sole responsibility for properly implementing, configuring, and
            maintaining such integration. Completion and ongoing maintenance of this integration
            constitute a condition precedent to accessing and using GoodLink’s CAPI and tracking
            functionalities.
          </p>
          <p>
            We reserve the right, at our sole discretion, to enhance, modify, or update GoodLink
            from time to time, provided that any such changes do not materially reduce the essential
            functionality of the Services as made available to you.
          </p>

          <h3>1.2 Account Access</h3>
          <p>
            In order to access and use the Services, the Client is required to register with
            GoodLink, create an account (the &quot;Client Account&quot;), and expressly accept
            these Terms of Service.
          </p>
          <p>
            The Client shall ensure that all individuals authorized to access the Services on its
            behalf (the &quot;Permitted Users&quot;) do so exclusively through the Client Account
            and in full compliance with this Agreement. The Client Account is personal to the
            Client and may not be shared with, assigned to, or used by any other person or entity.
          </p>
          <p>
            The Client bears sole responsibility for safeguarding the confidentiality and security
            of all usernames, passwords, and other login credentials associated with the Client
            Account, and for all activities conducted through the Client Account, whether such
            activities are authorized by the Client or not.
          </p>
          <p>
            The Client shall promptly notify GoodLink in writing of any actual, suspected, or
            threatened unauthorized access to or use of the Services or the Client Account. GoodLink
            reserves the right, at its sole discretion, to suspend, disable, modify, or terminate
            the Client Account if it determines that the account has been used, or is reasonably
            suspected of being used, for any unauthorized, unlawful, or prohibited purpose.
          </p>

          <h3>1.3 Usage Overages</h3>
          <p>
            GoodLink establishes and enforces specific usage limits applicable to each subscription
            plan or enterprise agreement. In the event that the Client exceeds the permitted usage
            thresholds for its plan and does not agree to pay any applicable overage fees or
            upgrade to a plan that accommodates the increased usage, GoodLink reserves the right, at
            its sole discretion, to: (i) suspend or restrict access to the Services, (ii) impose
            additional limitations or conditions on usage, or (iii) terminate the applicable
            agreement or subscription.
          </p>

          <h3>1.4 Access Suspension</h3>
          <p>
            GoodLink may, at any time and at its sole discretion, and without limiting any other
            rights or remedies available under this Agreement or applicable law, suspend or restrict
            your access to and use of the Services in any of the following circumstances:
          </p>
          <ul>
            <li>For scheduled or routine maintenance of the Services;</li>
            <li>As a result of a Force Majeure Event;</li>
            <li>If you or any Permitted User breaches any term or condition of this Agreement;</li>
            <li>To address urgent or emergency security issues; or</li>
            <li>
              If required by any governmental, regulatory, or legal authority, or due to changes in
              applicable law or regulations.
            </li>
          </ul>

          <h3>1.5 Fair Use</h3>
          <p>
            You are solely responsible for your use of the Services and for all content that you
            post, upload, or transmit through the Services. You may not use the Services for any
            unlawful, malicious, or abusive purpose, including, without limitation:
          </p>
          <ul>
            <li>Hosting, linking to, or promoting phishing, scam, or otherwise deceptive websites;</li>
            <li>Hosting, distributing, or linking to pornography or other adult content;</li>
            <li>Infringing upon the intellectual property or copyrights of others;</li>
            <li>
              Redirecting links to other URL shorteners in order to obscure the final destination
              for malicious purposes;
            </li>
            <li>
              Accessing or using the Services to develop, test, benchmark, or copy a competing
              product, including creating accounts under false identities for competitive analysis;
            </li>
            <li>
              Reverse engineering, scraping, crawling, or otherwise attempting to extract data,
              algorithms, internal functionality, or proprietary information from the Services;
            </li>
            <li>
              Circumventing, disabling, or interfering with any security, authentication, usage
              limits, or billing mechanisms of the Services.
            </li>
          </ul>
          <p>
            While the free plan may be used for commercial purposes, excessive usage, including an
            unusually high volume of clicks or links, may constitute a violation of GoodLink’s fair
            use policy. Accordingly, GoodLink reserves the right, at its sole discretion, to
            suspend, restrict, or terminate your access to the Services if it determines that you
            have breached these Terms of Service.
          </p>

          <h2>2. Data Ownership</h2>
          <h3>2.1 Privacy Policy</h3>
          <p>
            By accessing or using GoodLink.ai, you acknowledge and agree to the terms of GoodLink’s
            Privacy Policy, which is hereby incorporated by reference and forms an integral part of
            this Agreement.
          </p>

          <h3>2.2 Shortlink Ownership</h3>
          <p>
            When using a default GoodLink.ai–owned domain (for example, glynk.to), GoodLink reserves
            the right, at its sole discretion, to reclaim any shortlink if necessary to ensure brand
            compliance, prevent user confusion, or protect the integrity and reputation of the
            Services. Additionally, any form of username squatting or attempts to reserve usernames
            for resale is strictly prohibited. GoodLink may, at its discretion, reclaim any username
            it reasonably determines is being used in bad faith.
          </p>

          <h3>2.3 Intellectual Property Rights</h3>
          <p>
            You acknowledge and agree that the Services, including all content, features, and
            functionality—such as software, code, text, graphics, images, videos, audio, designs,
            layouts, selection, and arrangement—are owned by GoodLink, its licensors, or other
            third-party providers, and are protected under United States and international
            copyright, trademark, patent, trade secret, and other intellectual property or
            proprietary rights laws. By registering for or using the Services, you grant GoodLink a
            limited, non-exclusive right to display your company name and logo in marketing and
            promotional materials.
          </p>
          <p>
            You retain all rights, title, and interest in and to your own data. During the term of
            this Agreement, you grant GoodLink a limited, non-exclusive, worldwide license to
            access, collect, use, process, store, disclose, sublicense, and transmit your data
            solely for the purpose of operating, providing, maintaining, and improving the Services
            and related offerings. Data that is anonymized or cannot be linked to you or your
            customers may also be used by GoodLink for analytics, support, and service enhancements.
          </p>
          <p>
            GoodLink may compile aggregated and anonymized performance metrics, usage statistics,
            and other analytical information derived from the Services (&quot;Usage Data&quot;). All
            Usage Data shall be aggregated and anonymized such that it cannot reasonably be used to
            identify you, your customers, or any individual. Usage Data is not considered your data
            or personal data, cannot be re-identified, and shall be deemed the property of GoodLink.
            All Usage Data will remain de-identified and anonymized.
          </p>

          <h2>3. Invoices</h2>
          <h3>3.1 Fees for Services</h3>
          <p>
            Clients utilizing GoodLink Links are required to pay the applicable subscription fees on
            a monthly or annual basis, as specified in their chosen plan.
          </p>
          <p>
            You agree to provide GoodLink with complete, accurate, and up-to-date billing
            information, and you hereby authorize GoodLink to automatically charge, request, or
            collect payment from your designated payment method or banking account. You further
            agree to supply any additional information that GoodLink may reasonably request to
            verify your payment account or financial details, in order to ensure timely payment.
            This includes providing updated payment information upon request, such as a revised
            credit card number or expiration date, as provided to us by your financial institution.
          </p>
          <p>
            Failure to remit payment of any Fees when due shall constitute a material breach of this
            Agreement and may result in the suspension or termination of your access to the
            Services. Unless explicitly stated otherwise, all Fees are payable in advance, in United
            States Dollars (USD), and are non-cancellable and non-refundable.
          </p>

          <h2>4. Service Termination</h2>
          <p>
            Either party may terminate this Agreement if the other party becomes insolvent, is
            unable to pay its debts as they mature, or materially breaches any provision of this
            Agreement and fails to cure such breach within thirty (30) days following written notice
            of the breach from the non-breaching party.
          </p>
          <p>
            Upon termination, you will have fifteen (15) days to access the Services in order to
            save or download your data. After this period, your account will be deactivated, and
            your data will no longer be accessible. GoodLink will retain your data for a minimum of
            thirty (30) days following termination, after which GoodLink may delete such data unless
            retention is required by applicable law.
          </p>
          <p>
            Upon termination of this Agreement, you must immediately cease all use of the GoodLink
            platform and destroy any confidential information obtained from the Services, to the
            extent permitted by law. GoodLink will issue a final invoice for all accrued but unpaid
            Fees, which shall be due and payable immediately.
          </p>

          <h2>5. Changes to These Terms</h2>
          <p>
            GoodLink reserves the right, at its sole discretion, to amend, modify, or update these
            Terms of Service at any time. All such changes shall become effective immediately upon
            posting on the Website and shall apply to all subsequent access to or use of the
            Website. Your continued use of the Website after any revisions constitutes your
            acceptance of and agreement to be bound by the updated Terms.
          </p>

          <h2>6. Warranties</h2>
          <p>Each party represents and warrants that:</p>
          <ul>
            <li>
              It has the full right and authority to enter into this Agreement and that doing so
              does not violate any obligations it may have to any third party; and
            </li>
            <li>
              It shall comply with all applicable laws, regulations, and rules in performing its
              obligations under this Agreement.
            </li>
          </ul>
          <p>
            The Client further represents and warrants that, throughout the term of this Agreement,
            it possesses and will maintain all necessary rights, licenses, consents, and
            authorizations under applicable law to provide GoodLink with Client Data for the purpose
            of operating GoodLink Links and any related services, as described in this Agreement and
            in the GoodLink Privacy Policy.
          </p>
          <p>
            GoodLink warrants that it will employ commercially reasonable measures and
            industry-standard practices to: (i) detect, identify, and remove malicious code from the
            GoodLink platform, and (ii) implement and maintain appropriate technical and
            organizational safeguards to protect Client Data from unauthorized access, loss, or
            disclosure. GoodLink shall not be liable for any malicious code, data breaches, or other
            security incidents arising from content, code, or data provided by the Client or its
            partners, or from integrations, systems, or environments outside of GoodLink’s control.
          </p>

          <h2>7. Disclaimer</h2>
          <p>
            THE GOODLINK PLATFORM, INCLUDING GOODLINK LINKS AND ALL RELATED SERVICES, IS PROVIDED ON
            AN “AS IS” AND “AS AVAILABLE” BASIS, TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW.
            EXCEPT AS EXPRESSLY SET FORTH IN THIS AGREEMENT, GOODLINK MAKES NO WARRANTIES,
            REPRESENTATIONS, OR CONDITIONS OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR
            OTHERWISE, INCLUDING, WITHOUT LIMITATION, WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
            PARTICULAR PURPOSE, NON-INFRINGEMENT, OR WARRANTIES ARISING FROM COURSE OF DEALING OR
            USAGE OF TRADE.
          </p>
          <p>
            EXCEPT AS EXPRESSLY PROVIDED IN THIS AGREEMENT, GOODLINK DOES NOT WARRANT THAT THE
            PLATFORM OR SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, NOR DOES IT GUARANTEE
            THAT ANY DATA, ANALYTICS, REPORTS, OR OTHER INFORMATION PROVIDED THROUGH THE PLATFORM
            WILL BE ACCURATE, COMPLETE, OR RELIABLE.
          </p>

          <h2>8. Confidentiality</h2>
          <p>
            For purposes of this Agreement, &quot;Confidential Information&quot; means any
            information disclosed by one party to the other in connection with this Agreement that
            is identified as proprietary or confidential by the disclosing party, or that should
            reasonably be understood to be confidential or proprietary given its nature and the
            circumstances of disclosure.
          </p>
          <p>Each party agrees to:</p>
          <ul>
            <li>
              Use the other party’s Confidential Information solely for the purpose of performing
              its obligations under this Agreement;
            </li>
            <li>
              Protect the other party’s Confidential Information with at least the same degree of
              care that it uses to protect its own confidential information of similar importance;
              and
            </li>
            <li>
              Not disclose the other party’s Confidential Information to any third party, except to
              employees, contractors, or professional advisors who have a legitimate need to access
              such information and who are bound by confidentiality obligations at least as
              protective as those set forth in this Agreement.
            </li>
          </ul>
          <p>
            The obligations set forth in this Section shall not apply to any information that the
            receiving party can demonstrate: (i) has become publicly known through no wrongful act
            or omission of the receiving party; (ii) was rightfully obtained from a third party
            without restriction on disclosure; or (iii) was independently developed by the receiving
            party without use of or reference to the disclosing party’s Confidential Information.
          </p>
          <p>
            The receiving party may disclose Confidential Information if required to do so by law,
            regulation, or court order, provided that, to the extent legally permissible, it gives
            prompt written notice to the disclosing party to allow the disclosing party to seek a
            protective order or other remedy. Upon termination of this Agreement, each party shall,
            at the disclosing party’s request, return or destroy all Confidential Information in its
            possession, except to the extent retention is required by applicable law.
          </p>

          <h2>9. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless GoodLink, together with its officers,
            directors, employees, agents, and affiliates (collectively, the &quot;Indemnified
            Parties&quot;), from and against any and all claims, damages, liabilities, losses, and
            expenses, including reasonable attorneys’ fees and settlement costs, arising out of or
            relating to:
          </p>
          <ul>
            <li>Your breach of this Agreement or any applicable law or regulation; or</li>
            <li>Your negligence, willful misconduct, or unlawful acts.</li>
          </ul>
          <p>
            GoodLink shall have the right to approve any counsel retained to defend any claim in
            which GoodLink is named as a party, such approval not to be unreasonably withheld.
            GoodLink also reserves the right to participate in, and at its discretion control, the
            defense of any such claim relating to matters affecting GoodLink, at GoodLink’s expense.
            You may not settle any claim that involves GoodLink without GoodLink’s prior reasonable
            consent.
          </p>
          <p>
            If, in GoodLink’s reasonable judgment, a conflict of interest arises between you and
            GoodLink in connection with a claim, GoodLink may retain separate counsel, whose
            reasonable fees and expenses shall be borne by you.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, NEITHER PARTY SHALL BE LIABLE TO THE
            OTHER UNDER OR IN CONNECTION WITH THIS AGREEMENT, WHETHER IN CONTRACT, TORT (INCLUDING
            NEGLIGENCE), STRICT LIABILITY, OR OTHERWISE, FOR ANY OF THE FOLLOWING:
          </p>
          <ul>
            <li>CONSEQUENTIAL, INCIDENTAL, INDIRECT, EXEMPLARY, SPECIAL, AGGRAVATED, OR PUNITIVE DAMAGES;</li>
            <li>ANY LOSS OF BUSINESS, REVENUE, PROFITS, PRODUCTION, OR DIMINUTION IN VALUE;</li>
            <li>LOSS OF GOODWILL OR REPUTATION;</li>
            <li>
              ANY INTERRUPTION, DELAY, INABILITY TO USE, LOSS, OR RECOVERY OF DATA, OR ANY BREACH OF
              DATA OR SYSTEM SECURITY; or
            </li>
            <li>COSTS OF REPLACEMENT GOODS OR SERVICES.</li>
          </ul>
          <p>
            THE FOREGOING LIMITATIONS APPLY REGARDLESS OF WHETHER THE PARTY WAS ADVISED OF THE
            POSSIBILITY OF SUCH DAMAGES OR WHETHER THEY WERE OTHERWISE FORESEEABLE.
          </p>
          <p>
            IN NO EVENT SHALL EITHER PARTY’S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO
            THIS AGREEMENT EXCEED THE TOTAL SUBSCRIPTION FEES PAID BY THE CLIENT TO GOODLINK DURING
            THE SIX (6) MONTH PERIOD IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          </p>
          <p>The limitations set forth above shall not apply to:</p>
          <ul>
            <li>CLIENT’S FAILURE TO PAY ANY FEES OR PARTNER COMMISSIONS DUE TO GOODLINK;</li>
            <li>ANY BREACH OF RESTRICTIONS ON USE; or</li>
            <li>ANY BREACH OF CONFIDENTIALITY OBLIGATIONS.</li>
          </ul>

          <h2>12. General</h2>
          <h3>12.1 Governing Law</h3>
          <p>
            This Agreement, including any disputes arising out of or relating to it, shall be
            governed by and construed in accordance with the laws of the State of Israel, without
            regard to its conflict of laws principles.
          </p>

          <h3>12.2 Dispute Resolution and Jurisdiction</h3>
          <p>
            Any dispute, claim, or controversy arising out of or relating to this Agreement,
            including its formation, interpretation, breach, or termination, shall be exclusively
            subject to the competent courts located in Tiberias, Israel. Both parties consent to the
            exclusive jurisdiction and venue of such courts and waive any objection based on forum
            or venue.
          </p>

          <h3>12.3 No Class Actions</h3>
          <p>
            All disputes arising under or related to this Agreement must be brought solely on an
            individual basis. You shall not initiate any class, consolidated, or representative
            action. This waiver constitutes an independent covenant.
          </p>

          <h3>12.4 Notices</h3>
          <p>
            All notices under this Agreement shall be provided by email. Notices to GoodLink must be
            sent to hello@goodlink.ai. Notices shall be deemed received when delivered.
          </p>

          <h3>12.5 Publicity</h3>
          <p>
            GoodLink may include your name in user lists and may use your company name, logo, or
            trademarks for marketing and publicity purposes on its website, in promotional
            materials, and in press releases.
          </p>

          <h3>12.6 Force Majeure</h3>
          <p>
            Except for payment obligations, neither party shall be liable for any failure or delay in
            performing its obligations under this Agreement caused by circumstances beyond its
            reasonable control, including but not limited to fires, power outages, extreme weather,
            labor disputes, or governmental actions (a &quot;Force Majeure Event&quot;), provided the
            affected party promptly notifies the other party and resumes performance as soon as
            reasonably possible. If a Force Majeure Event causes a delay exceeding ninety (90) days
            without resolution, either party may terminate this Agreement without penalty.
          </p>

          <h3>12.7 No Assignment</h3>
          <p>
            You may not assign or transfer this Agreement, by operation of law or otherwise, without
            GoodLink’s prior written consent. Subject to this restriction, this Agreement shall be
            binding upon and inure to the benefit of the parties and their respective successors and
            permitted assigns.
          </p>

          <h3>12.8 Entire Agreement</h3>
          <p>
            This Agreement constitutes the entire agreement between the parties with respect to its
            subject matter and supersedes all prior agreements, understandings, or communications,
            whether written or oral. If any provision is found to be unenforceable, it shall be
            modified to reflect the parties’ intention to the maximum extent necessary to make it
            enforceable, and the remaining provisions shall remain in full force and effect. No
            waiver of any default shall constitute a waiver of any subsequent default. There are no
            third-party beneficiaries to this Agreement.
          </p>

          <h3>12.9 Waiver</h3>
          <p>
            Any waiver under this Agreement must be in writing and shall apply only to the specific
            instance and occurrence described therein. Failure by either party to insist on strict
            performance of this Agreement or to enforce any rights shall not constitute a waiver of
            such rights, which shall remain in full force and effect.
          </p>

          <h3>12.10 Survival</h3>
          <p>
            All provisions of this Agreement that are expressly stated to survive, or which by their
            nature are intended to survive termination or expiration, shall continue in full force
            and effect notwithstanding the termination or expiration of this Agreement.
          </p>

          <p>
            By using GoodLink.ai, you acknowledge that you have read these Terms of Service,
            understood them, and agree to be bound by them. If you do not agree to these Terms of
            Service, you are not authorized to use the Service. We reserve the right to change these
            Terms of Service at any time, so please review them frequently. Thank you for using
            GoodLink!
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;

