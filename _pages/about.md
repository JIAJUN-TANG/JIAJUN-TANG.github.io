---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>
{% include_relative include/intro.md %}

{% include_relative include/news.md %}

{% include_relative include/edu.md %}

{% include_relative include/pub.md %}

{% include_relative include/conf.md %}

{% include_relative include/honers.md %}

{% include_relative include/others.md %}

{% include_relative include/post.md %}

<script type='text/javascript' id='clustrmaps' src='//cdn.clustrmaps.com/map_v2.js?cl=080808&w=70&t=tt&d=RHmH9Rm0U_mTLBU7EsTd14Rfv_kK2UyNU0-BtD_pJfE&co=ffffff&ct=808080&cmo=3acc3a&cmn=ff5353'></script>