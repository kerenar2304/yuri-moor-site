/* runs in <head> before anything paints: marks that JS is on, ?static for screenshots, and flags a failed asset */
(function(d){d.classList.add('js');var q=new URLSearchParams(location.search);if(q.has('static'))d.classList.add('static');
addEventListener('error',function(){d.classList.add('r-fail')});
})(document.documentElement)
