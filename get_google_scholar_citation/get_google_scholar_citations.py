from scholarly import scholarly
import json
from datetime import datetime
import os

# 获取环境变量中的Google Scholar ID，如果没有则从profile.yml中读取
if 'GOOGLE_SCHOLAR_ID' in os.environ:
    scholar_id = os.environ['GOOGLE_SCHOLAR_ID']
else:
    # 尝试从profile.yml文件中读取Google Scholar ID
    try:
        import yaml
        with open('_data/profile.yml', 'r', encoding='utf-8') as f:
            profile_data = yaml.safe_load(f)
            scholar_id = profile_data.get('gscholar')
    except Exception as e:
        print(f"Error reading profile.yml: {e}")
        # 如果读取失败，使用默认值
        scholar_id = 'cXJ2lKAAAAAJ'

author: dict = scholarly.search_author_id(scholar_id)
scholarly.fill(author, sections=['basics', 'indices', 'counts', 'publications'])
name = author['name']
author['updated'] = str(datetime.now())
author['publications'] = {v['author_pub_id']:v for v in author['publications']}