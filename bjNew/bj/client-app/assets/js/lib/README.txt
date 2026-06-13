这里放第三方库（结构图里 1-client-app/assets/js/lib/）。

原型阶段为了双击 HTML 就能用，所有页面里的 jQuery 都从 CDN 加载：
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>

将来部署到真实服务器时，把 jquery.min.js 下载放到这个文件夹下，
然后把所有页面 <script src="..."> 改成：
    <script src="../../assets/js/lib/jquery.min.js"></script>

这样就和你 d139 项目的目录习惯保持一致。
