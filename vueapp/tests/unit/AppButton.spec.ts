import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AppButton from '../../components/common/AppButton.vue';

describe('AppButton', () => {
  it('renders the button with the correct label', () => {
    // Arrange
    const label = 'Click Me';
    const wrapper = mount(AppButton, {
      slots: { default: label },
    });

    // Assert
    expect(wrapper.text()).toBe(label);
  });

  it('emits a click event when clicked', async () => {
    // Arrange
    const wrapper = mount(AppButton, {
      props: { label: 'Clickable' },
    });

    // Act
    await wrapper.trigger('click');

    // Assert
    expect(wrapper.emitted().click).toBeTruthy();
    expect(wrapper.emitted().click.length).toBe(1);
  });

  it('does not emit a click event when disabled', async () => {
    // Arrange
    const wrapper = mount(AppButton, {
      props: { label: 'Disabled', disabled: true },
    });

    // Act
    await wrapper.trigger('click');

    // Assert
    expect(wrapper.emitted().click).toBeFalsy();
  });
});
