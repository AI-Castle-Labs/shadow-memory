import type { SampleConversation } from '../types';

export const sampleConversations: SampleConversation[] = [
  {
    id: 'travel',
    name: 'Trip to Japan',
    description: 'Planning a 2-week Japan adventure',
    messages: [
      {
        role: 'user',
        content: "I'm planning a trip to Japan for 2 weeks in April. I want to see the cherry blossoms and experience both traditional and modern Japan. Where should I go?",
      },
      {
        role: 'assistant',
        content: `What an exciting trip! April is perfect for cherry blossoms in Japan. Here's a suggested itinerary that balances traditional and modern experiences:

**Week 1: Tokyo & Surroundings**
- Days 1-4: Tokyo - Explore Shibuya, Shinjuku, Akihabara for modern vibes. Visit Senso-ji Temple in Asakusa and the Imperial Palace gardens for tradition.
- Days 5-6: Day trips to Nikko (UNESCO temples) and Hakone (Mt. Fuji views, hot springs)

**Week 2: Kyoto & Beyond**
- Days 7-10: Kyoto - The heart of traditional Japan. Fushimi Inari, Kinkaku-ji, Arashiyama bamboo grove, and the geisha district of Gion.
- Days 11-12: Osaka - Food paradise! Try takoyaki and explore Dotonbori.
- Days 13-14: Hiroshima & Miyajima day trip, then back to Tokyo

For cherry blossoms, I'd recommend visiting Philosopher's Path in Kyoto and Ueno Park in Tokyo. Would you like me to elaborate on any of these destinations or help with accommodation suggestions?`,
      },
      {
        role: 'user',
        content: "This looks amazing! I'm particularly interested in the Kyoto portion. What are the best areas to stay, and should I get a JR Pass?",
      },
      {
        role: 'assistant',
        content: `Great questions! Let me break these down:

**Where to Stay in Kyoto:**

1. **Gion / Higashiyama** (My top pick)
   - Traditional machiya houses, walking distance to temples
   - Best for atmosphere and sightseeing
   - Price range: ¥15,000-40,000/night

2. **Kyoto Station Area**
   - Most convenient for transportation
   - Modern hotels, easier with luggage
   - Price range: ¥12,000-25,000/night

3. **Downtown (Kawaramachi/Shijo)**
   - Balance of access and nightlife
   - Great shopping and dining
   - Price range: ¥10,000-30,000/night

**JR Pass - Absolutely Yes!**

For your itinerary, the 14-day JR Pass (¥50,000) is excellent value:
- Tokyo ↔ Kyoto shinkansen alone = ¥27,000 round trip
- Plus Hiroshima, Nikko, local JR lines
- You'll save ¥30,000+ easily

**Pro tip:** Activate your JR Pass on Day 5 when you leave Tokyo. Use regular metro for Tokyo days to maximize value.

Would you like ryokan (traditional inn) recommendations in Kyoto? A night in a ryokan with kaiseki dinner is an unforgettable experience!`,
      },
      {
        role: 'user',
        content: "Yes! I'd love a ryokan recommendation. Budget around $300-400/night for one special night.",
      },
      {
        role: 'assistant',
        content: `Perfect budget for an authentic ryokan experience! Here are my top picks in Kyoto:

**Top Recommendations:**

1. **Gion Hatanaka** ⭐ My Pick
   - Location: Heart of Gion
   - Price: ~¥45,000/night ($320) with dinner & breakfast
   - Why: Maiko (apprentice geisha) performance at dinner, stunning traditional rooms
   - Book 2-3 months ahead for April!

2. **Seikoro Inn**
   - Location: Higashiyama
   - Price: ~¥50,000/night ($350)
   - Why: 130-year-old inn, beautiful garden, exceptional kaiseki
   - More intimate, only 20 rooms

3. **Yuzuya Ryokan**
   - Location: Near Nanzen-ji Temple
   - Price: ~¥40,000/night ($280)
   - Why: Private onsen baths, quieter location
   - Best for relaxation

**Ryokan Etiquette Tips:**
- Arrive by 5pm (dinner served around 6-7pm)
- Yukata (cotton robe) provided - wear it!
- Shoes off at entrance, slippers for hallways
- Tip isn't expected but appreciated

**I'd recommend night 8 or 9** of your trip - gives you time to settle into Kyoto first, and you'll sleep amazingly before your remaining adventures.

Shall I help draft a complete day-by-day itinerary for your Kyoto portion?`,
      },
    ],
    memories: [
      {
        content: "User is planning a 2-week trip to Japan in April specifically to see cherry blossoms",
        topics: ['japan', 'travel', 'cherry-blossoms', 'trip-planning'],
      },
      {
        content: "User wants to experience both traditional and modern Japan - balance of old and new culture",
        topics: ['japan', 'culture', 'traditional', 'modern'],
      },
      {
        content: "User's budget for ryokan accommodation is $300-400 per night for one special night",
        topics: ['japan', 'accommodation', 'budget', 'ryokan'],
      },
      {
        content: "User is particularly interested in Kyoto portion of the Japan trip",
        topics: ['japan', 'kyoto', 'travel', 'itinerary'],
      },
      {
        content: "User is considering whether to get a JR Pass for Japan travel",
        topics: ['japan', 'transportation', 'jr-pass', 'travel-tips'],
      },
    ],
  },
  {
    id: 'finance',
    name: 'Investment Basics',
    description: 'Understanding index funds & portfolio building',
    messages: [
      {
        role: 'user',
        content: "I'm 28 and just started my first job with good income. I have $10,000 saved and want to start investing but I'm overwhelmed. Where do I even begin?",
      },
      {
        role: 'assistant',
        content: `Congratulations on taking this important step! Starting at 28 with $10,000 puts you in a great position. Let me break this down into manageable pieces:

**First, Before Investing:**

1. **Emergency Fund** - Do you have 3-6 months of expenses saved separately?
2. **High-Interest Debt** - Pay off any credit cards first (guaranteed "return")
3. **401(k) Match** - If your employer offers matching, that's free money!

**Assuming those are covered, here's a simple starting framework:**

**The Three-Fund Portfolio** (Classic approach)
- US Stock Index Fund (60-70%)
- International Stock Index Fund (20-30%)
- Bond Index Fund (5-10% - you're young, can be lower)

**Why Index Funds?**
- Low fees (0.03-0.20% vs 1%+ for active funds)
- Automatic diversification
- Historically outperform most active managers
- "Set and forget" friendly

**Where to Open an Account:**
- Fidelity, Vanguard, or Schwab (all excellent, low fees)
- Roth IRA first if eligible (tax-free growth!)
- Then taxable brokerage for additional investing

Would you like me to explain the difference between Roth IRA and traditional accounts, or dive deeper into index fund selection?`,
      },
      {
        role: 'user',
        content: "I have a 6-month emergency fund and no debt. My company matches 401k up to 4% which I'm doing. I'm interested in the Roth IRA - can you explain more?",
      },
      {
        role: 'assistant',
        content: `You're already ahead of most people your age! With the 401k match captured, a Roth IRA is an excellent next step. Here's why:

**Roth IRA Basics:**

- **Contribution Limit:** $7,000/year (2024)
- **Tax Treatment:** Contribute with after-tax money, but ALL growth is tax-FREE
- **Withdrawals:** Tax-free after 59½ (contributions can be withdrawn anytime)
- **Income Limits:** Full contribution if income < $146,000 (single)

**Why Roth at Your Age:**

Your $7,000 invested at 28 could become **$150,000+** by 65 (assuming 8% avg return). With a traditional IRA, you'd pay taxes on that growth. With Roth? All $150k is yours tax-free.

**Simple Math Example:**
| | Traditional IRA | Roth IRA |
|---|---|---|
| Invest | $7,000 (pre-tax) | $7,000 (after-tax) |
| Grows to (65) | $150,000 | $150,000 |
| Taxes at withdrawal | ~$30,000 (20% bracket) | $0 |
| **You keep** | **$120,000** | **$150,000** |

**How to Open One:**

1. Open at Fidelity, Vanguard, or Schwab (10 min online)
2. Fund with up to $7,000
3. Buy a target-date fund (e.g., "Target 2060") or index funds
4. Done! Contribute monthly if possible.

**Your $10,000 Strategy:**
- $7,000 → Max out 2024 Roth IRA
- $3,000 → Keep as additional emergency buffer or taxable investing

Ready to discuss what to invest in inside the Roth?`,
      },
      {
        role: 'user',
        content: 'Yes please! What should I actually buy inside the Roth IRA?',
      },
      {
        role: 'assistant',
        content: `Great question! Here are your main options, from simplest to most hands-on:

**Option 1: Target Date Fund** (Easiest - "One and Done")

Just buy **one fund** like:
- Fidelity: FDKLX (Freedom Index 2060)
- Vanguard: VTTSX (Target Retirement 2060)
- Schwab: SWYJX (Target 2060)

**Pros:** Automatic diversification, rebalances itself, adjusts as you age
**Cons:** Slightly higher fee (~0.12%), less control
**Best for:** People who want simplicity

---

**Option 2: Three-Fund Portfolio** (DIY Classic)

Build it yourself with:
| Fund | Allocation | Example (Fidelity) |
|------|------------|---------------------|
| US Total Market | 60% | FSKAX (0.015% fee) |
| International | 30% | FTIHX (0.06% fee) |
| Bonds | 10% | FXNAX (0.025% fee) |

**Pros:** Lowest possible fees, full control
**Cons:** Annual rebalancing needed, more decisions
**Best for:** People who like understanding their portfolio

---

**Option 3: Two-Fund Simplicity** (My Favorite for Beginners)

| Fund | Allocation | Example |
|------|------------|---------|
| VTI or FSKAX (US Total Market) | 80% | |
| VXUS or FTIHX (International) | 20% | |

**Why I like this:**
- Ultra-low fees
- Skip bonds while young (higher growth potential)
- Add bonds in your 40s

---

**My Recommendation for You:**

Start with **Option 1 (Target Date Fund)** to get invested immediately. You can always switch later as you learn more. The most important thing is getting your money working NOW - time in market beats timing the market.

Want me to walk through the actual steps to buy your first fund?`,
      },
    ],
    memories: [
      {
        content: "User is 28 years old with their first good job and $10,000 saved wanting to start investing",
        topics: ['finance', 'investing', 'age-28', 'savings'],
      },
      {
        content: "User already has a 6-month emergency fund and no debt",
        topics: ['finance', 'emergency-fund', 'debt-free'],
      },
      {
        content: "User's employer offers 401k match up to 4% which they are already using",
        topics: ['finance', '401k', 'employer-match'],
      },
      {
        content: "User is interested in Roth IRA and wants to understand the tax benefits",
        topics: ['finance', 'roth-ira', 'taxes', 'retirement'],
      },
      {
        content: "User has $10,000 to invest and wants guidance on allocation strategy",
        topics: ['finance', 'investment-strategy', 'portfolio', 'allocation'],
      },
    ],
  },
  {
    id: 'tech',
    name: 'Debugging Crashes',
    description: 'Solving a mysterious app crash issue',
    messages: [
      {
        role: 'user',
        content: "My React app keeps crashing randomly with 'Maximum update depth exceeded'. It happens somewhere in my dashboard but I can't figure out where. How do I debug this?",
      },
      {
        role: 'assistant',
        content: `The "Maximum update depth exceeded" error is a classic React infinite loop! It happens when a component keeps triggering re-renders endlessly. Let me help you track this down.

**Most Common Causes:**

1. **useEffect without proper dependencies**
\`\`\`jsx
// BAD - runs forever
useEffect(() => {
  setData(processData(data));
}); // missing dependency array!

// GOOD
useEffect(() => {
  setData(processData(data));
}, []); // runs once
\`\`\`

2. **Calling setState directly in render**
\`\`\`jsx
// BAD
function Dashboard() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // infinite loop!
  return <div>{count}</div>;
}
\`\`\`

3. **Object/array in useEffect deps**
\`\`\`jsx
// BAD - new object every render
useEffect(() => {
  fetchData(options);
}, [{ page: 1 }]); // always "new" object!
\`\`\`

**Debugging Steps:**

1. **Add console.logs to your useEffects:**
\`\`\`jsx
useEffect(() => {
  console.log('Effect running in Dashboard');
  // your code
}, [deps]);
\`\`\`

2. **Check React DevTools** - Look for components that keep flashing (re-rendering)

3. **Binary search** - Comment out half your dashboard code, see if crash stops. Narrow down.

Can you share the code from your Dashboard component? Or tell me what state/effects it has?`,
      },
      {
        role: 'user',
        content: "Here's my Dashboard component:\n\n```jsx\nfunction Dashboard({ userId }) {\n  const [data, setData] = useState(null);\n  const [filters, setFilters] = useState({ status: 'all', date: new Date() });\n  \n  useEffect(() => {\n    fetchUserData(userId, filters).then(setData);\n  }, [userId, filters]);\n  \n  useEffect(() => {\n    setFilters(prev => ({ ...prev, date: new Date() }));\n  }, [data]);\n  \n  return <div>...</div>;\n}\n```",
      },
      {
        role: 'assistant',
        content: `Found it! You have a **circular dependency loop** between your two useEffects. Here's what's happening:

**The Infinite Loop:**

\`\`\`
1. Component mounts
2. First useEffect: fetches data → setData()
3. data changes → triggers second useEffect
4. Second useEffect: setFilters() with new date
5. filters changes → triggers first useEffect
6. First useEffect: fetches data → setData()
7. GOTO step 3 ♾️
\`\`\`

**The Problem:**

\`\`\`jsx
// This creates a NEW Date object every time data changes
useEffect(() => {
  setFilters(prev => ({ ...prev, date: new Date() }));
}, [data]); // Why update filters when data changes?
\`\`\`

**The Fix:**

Remove the second useEffect entirely, or restructure your logic:

\`\`\`jsx
function Dashboard({ userId }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ 
    status: 'all', 
    date: new Date() 
  });
  
  // Only fetch when userId or filters change intentionally
  useEffect(() => {
    fetchUserData(userId, filters).then(setData);
  }, [userId, filters]);
  
  // If you need to track "last fetched" time, use a separate ref:
  const lastFetched = useRef(null);
  
  useEffect(() => {
    fetchUserData(userId, filters).then(result => {
      setData(result);
      lastFetched.current = new Date(); // doesn't cause re-render
    });
  }, [userId, filters]);
  
  return <div>...</div>;
}
\`\`\`

**Questions to clarify the fix:**

1. What was the second useEffect supposed to do?
2. Do you need to show "last updated" time to users?
3. Should filters reset when data changes, or vice versa?

Let me know and I'll give you the exact code you need!`,
      },
      {
        role: 'user',
        content: 'The second useEffect was supposed to refresh the date filter when new data comes in. But now I realize that makes no sense - it should only update when the user clicks a refresh button. Thanks! How do I prevent similar issues in the future?',
      },
      {
        role: 'assistant',
        content: `Exactly! That "aha" moment is the key insight. Here are patterns to prevent these issues:

**1. The Dependency Audit Rule**

Before writing any useEffect, ask:
- "What EXTERNAL events should trigger this?"
- If the answer involves state you're setting IN the effect → 🚩 red flag

\`\`\`jsx
// 🚩 Setting state that's also a dependency = danger
useEffect(() => {
  setThing(computeFromThing(thing)); // CAREFUL!
}, [thing]);

// ✅ Use functional updates or useMemo instead
const computedThing = useMemo(() => compute(thing), [thing]);
\`\`\`

**2. The "One-Way Data Flow" Principle**

Draw your data flow:
\`\`\`
User Action → State Change → Effect → API → State Change
     ↑                                           |
     └───────────────────────────────────────────┘
                    (only via user action!)
\`\`\`

**3. ESLint Rules (Must Have!)**

\`\`\`bash
npm install eslint-plugin-react-hooks
\`\`\`

\`\`\`json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
\`\`\`

**4. Common Safe Patterns:**

\`\`\`jsx
// ✅ Event-driven updates
const handleRefresh = () => {
  setFilters(prev => ({ ...prev, date: new Date() }));
};

// ✅ Initial fetch only
useEffect(() => {
  fetchData();
}, []); // empty = mount only

// ✅ Derived state with useMemo (no effect needed!)
const sortedData = useMemo(() => 
  data?.sort((a, b) => b.date - a.date),
  [data]
);
\`\`\`

**5. When You DO Need Circular Updates:**

Use a ref to break the cycle:
\`\`\`jsx
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }
  // Only runs after initial mount
}, [dependency]);
\`\`\`

Your intuition is now calibrated - trust it! When something feels "tangled," it probably is.`,
      },
    ],
    memories: [
      {
        content: "User is 28 years old with their first good job and $10,000 saved wanting to start investing",
        topics: ['finance', 'investing', 'age-28', 'savings'],
      },
      {
        content: "User already has a 6-month emergency fund and no debt",
        topics: ['finance', 'emergency-fund', 'debt-free'],
      },
      {
        content: "User's employer offers 401k match up to 4% which they are already using",
        topics: ['finance', '401k', 'employer-match'],
      },
      {
        content: "User is interested in Roth IRA and wants to understand the tax benefits",
        topics: ['finance', 'roth-ira', 'taxes', 'retirement'],
      },
      {
        content: "User has $10,000 to invest and wants guidance on allocation strategy",
        topics: ['finance', 'investment-strategy', 'portfolio', 'allocation'],
      },
    ],
  },
  {
    id: 'tech',
    name: 'Debugging Crashes',
    description: 'Solving a mysterious app crash issue',
    messages: [
      {
        role: 'user',
        content: "My React app keeps crashing randomly with 'Maximum update depth exceeded'. It happens somewhere in my dashboard but I can't figure out where. How do I debug this?",
      },
      {
        role: 'assistant',
        content: `The "Maximum update depth exceeded" error is a classic React infinite loop! It happens when a component keeps triggering re-renders endlessly. Let me help you track this down.

**Most Common Causes:**

1. **useEffect without proper dependencies**
\`\`\`jsx
// BAD - runs forever
useEffect(() => {
  setData(processData(data));
}); // missing dependency array!

// GOOD
useEffect(() => {
  setData(processData(data));
}, []); // runs once
\`\`\`

2. **Calling setState directly in render**
\`\`\`jsx
// BAD
function Dashboard() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // infinite loop!
  return <div>{count}</div>;
}
\`\`\`

3. **Object/array in useEffect deps**
\`\`\`jsx
// BAD - new object every render
useEffect(() => {
  fetchData(options);
}, [{ page: 1 }]); // always "new" object!
\`\`\`

**Debugging Steps:**

1. **Add console.logs to your useEffects:**
\`\`\`jsx
useEffect(() => {
  console.log('Effect running in Dashboard');
  // your code
}, [deps]);
\`\`\`

2. **Check React DevTools** - Look for components that keep flashing (re-rendering)

3. **Binary search** - Comment out half your dashboard code, see if crash stops. Narrow down.

Can you share the code from your Dashboard component? Or tell me what state/effects it has?`,
      },
      {
        role: 'user',
        content: "Here's my Dashboard component:\n\n```jsx\nfunction Dashboard({ userId }) {\n  const [data, setData] = useState(null);\n  const [filters, setFilters] = useState({ status: 'all', date: new Date() });\n  \n  useEffect(() => {\n    fetchUserData(userId, filters).then(setData);\n  }, [userId, filters]);\n  \n  useEffect(() => {\n    setFilters(prev => ({ ...prev, date: new Date() }));\n  }, [data]);\n  \n  return <div>...</div>;\n}\n```",
      },
      {
        role: 'assistant',
        content: `Found it! You have a **circular dependency loop** between your two useEffects. Here's what's happening:

**The Infinite Loop:**

\`\`\`
1. Component mounts
2. First useEffect: fetches data → setData()
3. data changes → triggers second useEffect
4. Second useEffect: setFilters() with new date
5. filters changes → triggers first useEffect
6. First useEffect: fetches data → setData()
7. GOTO step 3 ♾️
\`\`\`

**The Problem:**

\`\`\`jsx
// This creates a NEW Date object every time data changes
useEffect(() => {
  setFilters(prev => ({ ...prev, date: new Date() }));
}, [data]); // Why update filters when data changes?
\`\`\`

**The Fix:**

Remove the second useEffect entirely, or restructure your logic:

\`\`\`jsx
function Dashboard({ userId }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ 
    status: 'all', 
    date: new Date() 
  });
  
  // Only fetch when userId or filters change intentionally
  useEffect(() => {
    fetchUserData(userId, filters).then(setData);
  }, [userId, filters]);
  
  // If you need to track "last fetched" time, use a separate ref:
  const lastFetched = useRef(null);
  
  useEffect(() => {
    fetchUserData(userId, filters).then(result => {
      setData(result);
      lastFetched.current = new Date(); // doesn't cause re-render
    });
  }, [userId, filters]);
  
  return <div>...</div>;
}
\`\`\`

**Questions to clarify the fix:**

1. What was the second useEffect supposed to do?
2. Do you need to show "last updated" time to users?
3. Should filters reset when data changes, or vice versa?

Let me know and I'll give you the exact code you need!`,
      },
      {
        role: 'user',
        content: 'The second useEffect was supposed to refresh the date filter when new data comes in. But now I realize that makes no sense - it should only update when the user clicks a refresh button. Thanks! How do I prevent similar issues in the future?',
      },
      {
        role: 'assistant',
        content: `Exactly! That "aha" moment is the key insight. Here are patterns to prevent these issues:

**1. The Dependency Audit Rule**

Before writing any useEffect, ask:
- "What EXTERNAL events should trigger this?"
- If the answer involves state you're setting IN the effect → 🚩 red flag

\`\`\`jsx
// 🚩 Setting state that's also a dependency = danger
useEffect(() => {
  setThing(computeFromThing(thing)); // CAREFUL!
}, [thing]);

// ✅ Use functional updates or useMemo instead
const computedThing = useMemo(() => compute(thing), [thing]);
\`\`\`

**2. The "One-Way Data Flow" Principle**

Draw your data flow:
\`\`\`
User Action → State Change → Effect → API → State Change
     ↑                                           |
     └───────────────────────────────────────────┘
                    (only via user action!)
\`\`\`

**3. ESLint Rules (Must Have!)**

\`\`\`bash
npm install eslint-plugin-react-hooks
\`\`\`

\`\`\`json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
\`\`\`

**4. Common Safe Patterns:**

\`\`\`jsx
// ✅ Event-driven updates
const handleRefresh = () => {
  setFilters(prev => ({ ...prev, date: new Date() }));
};

// ✅ Initial fetch only
useEffect(() => {
  fetchData();
}, []); // empty = mount only

// ✅ Derived state with useMemo (no effect needed!)
const sortedData = useMemo(() => 
  data?.sort((a, b) => b.date - a.date),
  [data]
);
\`\`\`

**5. When You DO Need Circular Updates:**

Use a ref to break the cycle:
\`\`\`jsx
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }
  // Only runs after initial mount
}, [dependency]);
\`\`\`

Your intuition is now calibrated - trust it! When something feels "tangled," it probably is.`,
      },
    ],
    memories: [
      {
        content: "User is debugging a React app crash with 'Maximum update depth exceeded' error",
        topics: ['react', 'debugging', 'infinite-loop', 'useEffect'],
      },
      {
        content: "The crash occurs in the Dashboard component specifically",
        topics: ['react', 'debugging', 'dashboard', 'components'],
      },
      {
        content: "User has two useEffects in Dashboard - one fetching data by userId/filters, one updating date when data changes",
        topics: ['react', 'useEffect', 'state', 'debugging'],
      },
      {
        content: "User's intended behavior was to refresh date filter on new data, but realized it should only update on user action",
        topics: ['react', 'state-management', 'user-interaction'],
      },
      {
        content: "User wants to prevent similar infinite loop issues in the future",
        topics: ['react', 'best-practices', 'prevention', 'eslint'],
      },
    ],
  },
];
