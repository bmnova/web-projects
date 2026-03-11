# web-projects

Here is a clean step-by-step build plan you can give to an AI agent.

AI Agent Build Instructions

Goal

Build a SaaS web app that helps startups create and publish social media content across:
	•	Reddit
	•	Instagram
	•	TikTok
	•	YouTube Shorts

The system should:
	•	connect user social accounts
	•	generate content ideas from brand/product info
	•	create platform-specific drafts
	•	let the user review and approve
	•	publish through official APIs where possible

Reddit should work differently:
	•	find relevant posts based on keywords/subreddits
	•	summarize them
	•	suggest a reply draft for the user
	•	wait for user approval
	•	publish the user-approved reply

⸻

Phase 1 — Project setup

Step 1

Create a new app using:
	•	Next.js
	•	TypeScript
	•	Tailwind
	•	Firebase

Step 2

Set up:
	•	Firebase Auth
	•	Firestore
	•	Firebase Storage

Step 3

Deploy frontend on Vercel.

Step 4

Create environment config for:
	•	Firebase
	•	Reddit OAuth
	•	Google/YouTube OAuth
	•	TikTok OAuth
	•	Meta/Instagram OAuth

⸻

Phase 2 — Core product structure

Step 5

Create the main entities:
	•	users
	•	workspaces
	•	brand profiles
	•	connected accounts
	•	content ideas
	•	assets
	•	approval tasks
	•	publish jobs
	•	reddit leads

Step 6

Build basic app pages:
	•	login
	•	onboarding
	•	dashboard
	•	research inbox
	•	content studio
	•	approvals
	•	calendar/queue
	•	settings

Step 7

Create workspace flow:
	•	user creates workspace
	•	user enters product/brand info
	•	user sets tone, ICP, CTA, banned terms
	•	user saves brand profile

⸻

Phase 3 — Account connection

Step 8

Implement OAuth connection flows for:
	•	Reddit
	•	YouTube
	•	TikTok
	•	Instagram

Step 9

Store connected account metadata securely:
	•	platform
	•	account name
	•	scopes
	•	token reference
	•	refresh token reference
	•	expiry

Step 10

Add “connected / expired / error” status handling.

⸻

Phase 4 — Brand intelligence input

Step 11

Create onboarding form for:
	•	product name
	•	product description
	•	website
	•	target audience
	•	tone of voice
	•	competitors
	•	example posts
	•	forbidden terms
	•	CTA style

Step 12

Save this as the brand profile used by all generation flows.

⸻

Phase 5 — Content idea generation

Step 13

Build idea generation logic that uses:
	•	brand profile
	•	target audience
	•	product use case
	•	selected platform

Step 14

Generate content ideas such as:
	•	pain point posts
	•	feature highlights
	•	educational content
	•	product comparisons
	•	founder story angles
	•	launch/update announcements

Step 15

Store generated ideas in Firestore.

⸻

Phase 6 — Platform-specific transformation

Step 16

For each content idea, create platform-specific outputs.

Instagram

Generate:
	•	carousel outline
	•	post caption
	•	static image caption
	•	reel concept

TikTok

Generate:
	•	short script
	•	hook
	•	speaking points
	•	caption
	•	hashtags

YouTube Shorts

Generate:
	•	short video script
	•	title ideas
	•	description
	•	hook and CTA

Reddit

Generate:
	•	post draft
	•	reply draft
	•	soft CTA version
	•	non-promotional version

⸻

Phase 7 — Reddit research workflow

Step 17

Build Reddit scanning module.

Input:
	•	target subreddits
	•	keywords
	•	product themes

Step 18

Fetch relevant Reddit posts and comments through official Reddit API.

Step 19

For each result:
	•	extract title
	•	extract body/snippet
	•	save post URL
	•	summarize context
	•	classify intent
	•	assign simple risk score

Step 20

Generate a suggested reply draft for the user.

Step 21

Show these in a “Research Inbox” page with:
	•	subreddit
	•	post title
	•	summary
	•	suggested reply
	•	approve/edit/skip buttons

Step 22

Only publish after the user explicitly approves or edits.

⸻

Phase 8 — Content studio

Step 23

Build a content studio where user can:
	•	view ideas
	•	open generated drafts
	•	edit captions/scripts
	•	edit Reddit replies
	•	approve or reject assets

Step 24

Support asset types:
	•	text draft
	•	carousel draft
	•	image draft
	•	video draft
	•	reddit reply draft

⸻

Phase 9 — Media generation layer

Step 25

Create simple template-based media generation.

Do not build a complex editor first.

Start with:
	•	Instagram carousel templates
	•	image quote/promo templates
	•	short video script templates

Step 26

Store outputs in Firebase Storage.

Step 27

Save asset references in Firestore.

⸻

Phase 10 — Approval system

Step 28

Create approval flow with statuses:
	•	draft
	•	pending approval
	•	approved
	•	rejected
	•	published

Step 29

Build Approval Center page where user reviews all pending items.

Step 30

Require approval before publishing for:
	•	Reddit replies
	•	Reddit posts
	•	Instagram posts
	•	TikTok posts
	•	YouTube uploads

⸻

Phase 11 — Publish queue

Step 31

Create publishJobs collection.

Each job should include:
	•	platform
	•	assetId
	•	accountId
	•	publish mode
	•	scheduledAt
	•	status
	•	error
	•	external post id

Step 32

Add publish modes:
	•	direct
	•	draft
	•	scheduled

Step 33

Create worker logic that picks queued jobs and sends them to the correct platform adapter.

⸻

Phase 12 — Platform publishers

Step 34

Build a publisher adapter per platform.

Reddit publisher
	•	publish approved reply
	•	publish approved post

Instagram publisher
	•	publish image
	•	publish carousel
	•	publish reel if supported in your chosen flow

TikTok publisher
	•	send post or draft through official posting API

YouTube publisher
	•	upload short-form video through YouTube video upload flow

Step 35

Save returned external IDs and publish status.

⸻

Phase 13 — Worker system

Step 36

Create separate worker layer for long tasks:
	•	Reddit scans
	•	content generation jobs
	•	media rendering
	•	scheduled publishing
	•	retries

Step 37

Use one of:
	•	Cloud Run
	•	Firebase Functions
	•	background worker service

Step 38

Implement job lifecycle:
	•	queued
	•	processing
	•	completed
	•	failed
	•	retrying

⸻

Phase 14 — Dashboard and tracking

Step 39

Build dashboard widgets for:
	•	connected accounts
	•	queued posts
	•	approval count
	•	recent published items
	•	Reddit leads found

Step 40

Add basic analytics model:
	•	views
	•	likes
	•	comments
	•	shares
	•	saves
	•	collectedAt

Step 41

Show simple analytics by:
	•	platform
	•	asset type
	•	recent post performance

⸻

Phase 15 — Guardrails

Step 42

Add validation rules before publishing:
	•	block forbidden terms
	•	block risky claims
	•	detect duplicate replies
	•	warn on overly promotional Reddit responses
	•	require user approval on risky content

Step 43

Add per-platform publish checks:
	•	missing media
	•	wrong media format
	•	expired token
	•	rate limit or publish limit errors

⸻

Phase 16 — MVP scope control

Step 44

Keep MVP small.

Build first:
	•	brand onboarding
	•	account connection
	•	content idea generation
	•	Reddit research inbox
	•	Reddit reply suggestion
	•	Instagram carousel drafts
	•	TikTok/YouTube short scripts
	•	approval system
	•	publish queue

Step 45

Do not build yet:
	•	advanced analytics
	•	full auto-posting without approval
	•	complex video editing UI
	•	multi-team permissions
	•	agency white-label

⸻

Phase 17 — Suggested implementation order

Step 46

Build in this order:
	1.	project setup
	2.	auth + firestore + storage
	3.	onboarding + brand profile
	4.	workspace dashboard
	5.	OAuth account connections
	6.	content idea generation
	7.	Reddit research inbox
	8.	Reddit draft reply flow
	9.	Instagram/TikTok/YouTube content transforms
	10.	approval center
	11.	publish jobs
	12.	platform publishers
	13.	analytics basics
	14.	polish

⸻

Final product behavior

Step 47

The final MVP should let a user do this:
	1.	sign up
	2.	create workspace
	3.	enter startup/product info
	4.	connect Reddit, Instagram, TikTok, YouTube
	5.	generate content ideas
	6.	review Reddit opportunities
	7.	approve/edit suggested replies
	8.	generate platform-specific content
	9.	approve posts
	10.	publish or schedule them

⸻

If you want, I can turn this into a proper task checklist format for Cursor / Claude Code / Devin / OpenHands next.