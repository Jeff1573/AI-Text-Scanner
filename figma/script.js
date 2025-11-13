// 页面切换功能
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');

    // 侧边栏切换功能
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            
            // 保存状态到本地存储
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
            
            console.log('侧边栏状态切换:', isCollapsed ? '已折叠' : '已展开');
        });
        
        // 恢复上次的侧边栏状态
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    // 为每个菜单项添加点击事件
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            
            // 移除所有活动状态
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));
            
            // 添加活动状态到当前选中的菜单项和页面
            this.classList.add('active');
            document.getElementById(targetPage + '-page').classList.add('active');
        });
    });

    // 为截图按钮添加点击效果
    const screenshotButton = document.querySelector('.screenshot-button');
    if (screenshotButton) {
        screenshotButton.addEventListener('click', function() {
            // 添加点击动画效果
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // 这里可以添加截图功能的模拟
            console.log('截图功能被触发');
        });
    }

    // 为设置表单按钮添加点击效果
    const saveButton = document.querySelector('.btn-primary');
    const resetButton = document.querySelector('.btn-secondary');
    
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            // 添加保存动画效果
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            console.log('保存设置');
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            // 添加重置动画效果
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            console.log('重置设置');
        });
    }

    // 为表单输入框添加焦点效果
    const formInputs = document.querySelectorAll('.form-input, .form-select');
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateY(-2px)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = '';
        });
    });
}); 