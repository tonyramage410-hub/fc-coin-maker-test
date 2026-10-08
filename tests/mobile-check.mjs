const preview=document.getElementById('preview');
for(const b of document.querySelectorAll('[data-width]'))b.addEventListener('click',()=>{preview.width=b.dataset.width;preview.height=b.dataset.height;document.getElementById('viewportStatus').textContent=`${b.dataset.width} × ${b.dataset.height}`;});
