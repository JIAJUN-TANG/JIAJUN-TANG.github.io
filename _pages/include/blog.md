---
layout: default
title: "Blogs"
permalink: /blog/
paginate: 5        # posts per page
paginate_path: "/blog/page:num/"
---

{% for post in paginator.posts %}
  …same list markup…
{% endfor %}
<nav class="pagination">
  {% if paginator.previous_page %}
    <a href="{{ paginator.previous_page_path }}">上一页</a>
  {% endif %}
  {% if paginator.next_page %}
    <a href="{{ paginator.next_page_path }}">下一页</a>
  {% endif %}
</nav>
