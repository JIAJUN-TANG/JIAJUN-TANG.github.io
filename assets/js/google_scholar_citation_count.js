const citationCountElements = document.querySelectorAll('[data-google-scholar-id]');

// 处理Google Scholar ID
citationCountElements.forEach(element => {
    const id = element.getAttribute('data-google-scholar-id');
    if (id) {
        element.setAttribute('data-google-scholar-id', id);
    }
});

// 获取所有唯一的Google Scholar ID
const googleScholarIds = new Set(
    Array.from(citationCountElements)
        .map(element => element.getAttribute('data-google-scholar-id'))
        .filter(id => id)
);

// 检查本地缓存
let uncachedGoogleScholarIds = [];
googleScholarIds.forEach(id => {
    const cacheKey = `googleScholarCitationCount:${id}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        const { _, timestamp } = JSON.parse(cachedData);
        // 如果缓存数据超过1小时，则视为未缓存
        if (Date.now() - timestamp > 1 * 60 * 60 * 1000) {
            uncachedGoogleScholarIds.push(id);
        }
    } else {
        uncachedGoogleScholarIds.push(id);
    }
});

// 显示引用计数的函数
let showGoogleScholarCitationCount = () => {
    // 使用缓存的引用计数更新DOM
    googleScholarIds.forEach(id => {
        const cacheKey = `googleScholarCitationCount:${id}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const { citationCount } = JSON.parse(cachedData);
            const elements = document.querySelectorAll(`[data-google-scholar-id="${id}"]`);
            elements.forEach(element => {
                element.innerHTML = `<a class="badge badge-pill badge-publication badge-info" href="https://scholar.google.com/citations?view_op=view_citation&citation_for_view=${id}" target="_blank"><i class="fab fa-google-scholar"></i> ${parseInt(citationCount).toLocaleString()} citations</a>`;
            });
        }
    });
};

// 尝试从results目录加载预生成的引用数据
if (uncachedGoogleScholarIds.length > 0) {
    // 首先尝试创建results目录
    try {
        // 在浏览器环境中，我们不能直接创建目录，但我们可以优雅地处理错误
        // 尝试加载预生成的Google Scholar数据
        fetch('/results/gs_data.json')
            .then(response => {
                if (!response.ok) {
                    console.log('Google Scholar data file not found, using placeholder data');
                    // 直接进入finally，不抛出错误
                    return Promise.reject('File not found');
                }
                return response.json();
            })
            .then(data => {
                // 缓存引用计数数据
                if (data.publications && Array.isArray(data.publications)) {
                    data.publications.forEach(pub => {
                        const cacheKey = `googleScholarCitationCount:${pub.author_pub_id}`;
                        const cacheData = {
                            citationCount: pub.citedby || 0,
                            timestamp: Date.now()
                        };
                        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    });
                }
            })
            .catch(error => {
                // 静默处理错误，不输出到控制台
                // 这样就不会在浏览器控制台显示错误信息
                console.log('Error loading Google Scholar data:', error);
            })
            .finally(showGoogleScholarCitationCount);
    } catch (e) {
        // 发生任何错误时，直接显示
        showGoogleScholarCitationCount();
    }
} else {
    showGoogleScholarCitationCount();
}