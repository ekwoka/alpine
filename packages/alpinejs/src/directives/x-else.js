import { evaluateLater } from '../evaluator'
import { addScopeToNode } from '../scope'
import { directive } from '../directives'
import { initTree, destroyTree } from '../lifecycle'
import { mutateDom } from '../mutation'
import { skipDuringClone } from '../clone'
import { warn } from "../utils/warn"


directive('else', (el, { expression }, { effect, cleanup }) => {
    if (el.tagName.toLowerCase() !== 'template') {
        warn('x-else can only be used on a <template> tag', el);
        return;
    }

    let prevElement = el.previousElementSibling;

    // Traverse up to find the correct previous sibling with _x_if
    while (prevElement && (!prevElement._x_if || !prevElement._x_if.expression)) {
        prevElement = prevElement.previousElementSibling;
    }

    if (!prevElement || !prevElement._x_if || !prevElement._x_if.expression) {
        warn('x-else requires an x-if before it with a valid expression', el);
        return;
    }

    let evaluate = evaluateLater(prevElement, prevElement._x_if.expression);

    let show = () => {
        if (el._x_currentElseEl) return el._x_currentElseEl;

        let clone = el.content.cloneNode(true).firstElementChild;

        addScopeToNode(clone, {}, el);

        mutateDom(() => {
            el.after(clone);
            skipDuringClone(() => initTree(clone))();
        });

        el._x_currentElseEl = clone;

        el._x_undoElse = () => {
            mutateDom(() => {
                destroyTree(clone);
                clone.remove();
            });

            delete el._x_currentElseEl;
        };

        return clone;
    };

    let hide = () => {
        if (!el._x_undoElse) return;

        el._x_undoElse();
        delete el._x_undoElse;
    };

    effect(() => evaluate(value => {
        value ? hide() : show();
    }));

    cleanup(() => el._x_undoElse && el._x_undoElse());
});



