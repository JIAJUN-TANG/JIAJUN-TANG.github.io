# 🧑‍💻 Recent Posts
<ul class="recent-posts">
  {% for post in site.posts limit:5 %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <small>({{ post.date | date: "%Y-%m-%d" }})</small>
    </li>
  {% endfor %}
</ul>

<style>
  .recent-posts {
    margin-top: 20px;
    padding-left: 20px;
    list-style-type: disc;
  }

  .recent-posts li {
    margin-bottom: 10px;
    font-size: 1rem;
  }

  .recent-posts a {
    color: #007acc;
    text-decoration: none;
  }

  .recent-posts a:hover {
    text-decoration: underline;
  }

  .recent-posts small {
    color: #666;
    font-size: 0.9rem;
  }
</style>